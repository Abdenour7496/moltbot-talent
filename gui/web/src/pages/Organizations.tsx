import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Building2,
  Users,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  plan: string;
  contactEmail: string;
  ownerId: string;
  maxActiveContracts: number;
  balance: number;
  active: boolean;
  createdAt: string;
  memberCount?: number;
  activeContracts?: number;
  members?: any[];
  contracts?: any[];
}

export function OrganizationsPage() {
  const { user: currentUser } = useAuth();
  const isOrgUser = !!currentUser?.tenantId;
  const isAdmin = currentUser?.role === 'admin';
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Tenant | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: '', industry: '', plan: 'starter', contactEmail: '' });
  const [addMemberId, setAddMemberId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [addMemberError, setAddMemberError] = useState('');

  const load = () => {
    api.getTenants().then(setTenants).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const loadDetail = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    const [d, u] = await Promise.all([api.getTenant(id), api.getUsers()]);
    setDetail(d);
    setAllUsers(u);
    setExpanded(id);
    setAddMemberId('');
    setAddMemberError('');
  };

  const create = async () => {
    await api.createTenant(form);
    setShowCreate(false);
    setForm({ name: '', industry: '', plan: 'starter', contactEmail: '' });
    load();
  };

  const update = async () => {
    if (!showEdit) return;
    await api.updateTenant(showEdit.id, form);
    setShowEdit(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    await api.deleteTenant(id);
    load();
  };

  const addMember = async (tenantId: string) => {
    if (!addMemberId) return;
    setAddMemberError('');
    try {
      await api.addTenantMember(tenantId, { userId: addMemberId });
      setAddMemberId('');
      const [d, u] = await Promise.all([api.getTenant(tenantId), api.getUsers()]);
      setDetail(d);
      setAllUsers(u);
      load();
    } catch (e: any) {
      setAddMemberError(e.message || 'Failed to add member');
    }
  };

  const removeMember = async (tenantId: string, userId: string) => {
    await api.removeTenantMember(tenantId, userId);
    const [d, u] = await Promise.all([api.getTenant(tenantId), api.getUsers()]);
    setDetail(d);
    setAllUsers(u);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">
            {isOrgUser ? 'Your department' : `${tenants.length} departments`}
          </p>
        </div>
        {!isOrgUser && (
          <button
            onClick={() => {
              setForm({ name: '', industry: '', plan: 'starter', contactEmail: '' });
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" /> New Department
          </button>
        )}
      </div>

      {/* Tenant cards */}
      <div className="space-y-3">
        {tenants.map((t) => {
          const isExpanded = expanded === t.id;

          return (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/5"
                onClick={() => loadDetail(t.id)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold">
                  {t.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{t.name}</h3>
                  <p className="text-xs text-muted">{t.industry} &middot; {t.slug}</p>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t.memberCount ?? 0} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {t.activeContracts ?? 0} active
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {!isOrgUser && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm({ name: t.name, industry: t.industry, plan: t.plan, contactEmail: t.contactEmail });
                          setShowEdit(t);
                        }}
                        className="rounded p-1.5 text-muted hover:text-foreground hover:bg-muted/10"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(t.id);
                        }}
                        className="rounded p-1.5 text-muted hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted" />
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && detail && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
                    <div>
                      <div className="text-muted">Contact</div>
                      <div className="font-medium">{detail.contactEmail}</div>
                    </div>
                    <div>
                      <div className="text-muted">Max Active Assignments</div>
                      <div className="font-medium">{detail.maxActiveContracts}</div>
                    </div>
                    <div>
                      <div className="text-muted">Status</div>
                      <div className={`font-medium ${detail.active ? 'text-success' : 'text-destructive'}`}>
                        {detail.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-1 text-sm font-semibold">
                      <Users className="h-4 w-4" /> Members ({detail.members?.length ?? 0})
                    </h4>
                    <div className="space-y-1">
                      {detail.members?.map((m: any) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg bg-muted/5 px-3 py-2 text-xs"
                        >
                          <div>
                            <span className="font-medium">{m.displayName || m.username}</span>
                            <span className="ml-2 text-muted">{m.role}</span>
                          </div>
                          <button
                            onClick={() => removeMember(detail.id, m.id)}
                            className="rounded p-1 text-muted hover:text-destructive"
                          >
                            <UserMinus className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {addMemberError && (
                      <div className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                        {addMemberError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={addMemberId}
                        onChange={(e) => setAddMemberId(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      >
                        <option value="">Select a user to add...</option>
                        {allUsers
                          .filter((u) => u.tenantId !== detail.id)
                          .map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.displayName || u.username} ({u.role}) — {u.email}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => addMember(detail.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                      >
                        <UserPlus className="h-3 w-3" /> Add
                      </button>
                    </div>
                  </div>

                  {/* Contracts */}
                  {detail.contracts && detail.contracts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1 text-sm font-semibold">
                        <Briefcase className="h-4 w-4" /> Contracts ({detail.contracts.length})
                      </h4>
                      <div className="space-y-1">
                        {detail.contracts.map((c: any) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 rounded-lg bg-muted/5 px-3 py-2 text-xs"
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                c.status === 'active'
                                  ? 'bg-green-500'
                                  : c.status === 'completed'
                                  ? 'bg-accent'
                                  : 'bg-muted'
                              }`}
                            />
                            <span className="flex-1 font-medium">{c.title}</span>
                            <span className="text-muted">{c.status}</span>
                            <span className="text-muted">${c.totalCost}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tenants.length === 0 && (
        <div className="py-16 text-center text-sm text-muted">
          No departments yet.
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreate || showEdit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {showCreate ? 'New Department' : 'Edit Department'}
            </h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Acme Corp"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <input
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="Engineering"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Contact Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="admin@acme.com"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={showCreate ? create : update}
                disabled={!form.name}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {showCreate ? (
                  <>
                    <Plus className="h-4 w-4" /> Create
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" /> Update
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowCreate(false); setShowEdit(null); }}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
