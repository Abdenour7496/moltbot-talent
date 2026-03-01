import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Bot,
  Search,
  Filter,
  Settings,
  Loader2,
  Building2,
  X,
  CheckCircle,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  active: boolean;
  loadedAt: string;
  departmentIds: string[];
  specialty: string | null;
  skills: string[];
  soul: string;
  expertise: string;
}

interface Tenant {
  id: string;
  name: string;
}

export function AgentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [agents, setAgents] = useState<Agent[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [assignModal, setAssignModal] = useState<Agent | null>(null);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getAgents();
      setAgents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      api.getTenants().then(setTenants).catch(() => {});
    }
  }, [isAdmin]);

  const handleAssign = async () => {
    if (!assignModal || !assignDeptId) return;
    setAssigning(true);
    try {
      await api.assignAgentToDept(assignModal.id, assignDeptId);
      setAssignModal(null);
      setAssignDeptId('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAssigning(false);
    }
  };

  const filtered = agents.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      (a.specialty ?? '').toLowerCase().includes(q) ||
      a.skills.some((s) => s.toLowerCase().includes(q));
    const matchesSpecialty = !specialtyFilter || a.specialty === specialtyFilter;
    return matchesSearch && matchesSpecialty;
  });

  const specialties = Array.from(new Set(agents.map((a) => a.specialty).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">AI Agents</h1>
          <p className="text-sm text-muted">{agents.length} agents available</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="w-full rounded-lg border border-border bg-input pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        {specialties.length > 0 && (
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-muted" />
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="rounded-lg border border-border bg-input px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="">All Specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Agent grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Bot className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 text-sm text-muted">
            {agents.length === 0 ? 'No agents loaded yet.' : 'No agents match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <div
              key={agent.id}
              className="flex flex-col rounded-xl border border-border bg-card p-4 hover:border-accent/40 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{agent.name}</h4>
                  {agent.specialty && (
                    <span className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      {agent.specialty}
                    </span>
                  )}
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    agent.active
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-muted/20 text-muted'
                  }`}
                >
                  <CheckCircle className="h-3 w-3" />
                  {agent.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Description */}
              {(agent.soul || agent.expertise) && (
                <p className="mt-3 line-clamp-2 text-xs text-muted">
                  {agent.soul || agent.expertise}
                </p>
              )}

              {/* Skills */}
              {agent.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {agent.skills.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-muted/10 px-2 py-0.5 text-[10px] text-muted"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Department tags */}
              {agent.departmentIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {agent.departmentIds.map((dId) => {
                    const dept = tenants.find((t) => t.id === dId);
                    return (
                      <span
                        key={dId}
                        className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-500"
                      >
                        <Building2 className="h-2.5 w-2.5" />
                        {dept?.name ?? dId}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Admin actions */}
              {isAdmin && (
                <div className="mt-auto pt-4 flex items-center gap-2 border-t border-border/50">
                  <button
                    onClick={() => {
                      setAssignModal(agent);
                      setAssignDeptId('');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                  >
                    <Building2 className="h-3 w-3" /> Assign to Department
                  </button>
                  <Link
                    to={`/marketplace/${agent.id}/configure`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-accent/40"
                  >
                    <Settings className="h-3 w-3" /> Configure
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign to Department modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <button
              onClick={() => setAssignModal(null)}
              className="absolute right-3 top-3 text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Assign {assignModal.name} to department
            </h3>

            <div className="mt-4">
              <label className="block text-xs font-medium mb-1">Department</label>
              <select
                value={assignDeptId}
                onChange={(e) => setAssignDeptId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="">Select a department…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setAssignModal(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!assignDeptId || assigning}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {assigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
