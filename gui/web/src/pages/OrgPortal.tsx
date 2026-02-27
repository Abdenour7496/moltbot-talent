import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Building2,
  Users,
  Briefcase,
  DollarSign,
  Bot,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  ShoppingBag,
  ArrowRight,
  Loader2,
  Shield,
  Zap,
  Rocket,
  Globe,
  Crown,
  Pencil,
  Save,
  X,
} from 'lucide-react';

interface OrgPortalData {
  tenant: {
    id: string;
    name: string;
    slug: string;
    industry: string;
    plan: string;
    contactEmail: string;
    ownerId: string;
    balance: number;
    active: boolean;
    createdAt: string;
  };
  stats: {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    totalSpend: number;
    hiredAgents: number;
    memberCount: number;
    balance: number;
    plan: string;
    maxActiveContracts: number;
  };
  members: any[];
  hiredAgents: any[];
  recentContracts: any[];
}

const planIcons: Record<string, typeof Shield> = {
  free: Shield,
  starter: Zap,
  pro: Rocket,
  enterprise: Globe,
};

const planColors: Record<string, string> = {
  free: 'text-muted',
  starter: 'text-blue-500',
  pro: 'text-accent',
  enterprise: 'text-yellow-500',
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-500/10', text: 'text-green-500' },
  paused: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  completed: { bg: 'bg-accent/10', text: 'text-accent' },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
};

export function OrgPortalPage() {
  const { user } = useAuth();
  const [data, setData] = useState<OrgPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', industry: '', contactEmail: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getOrgPortal()
      .then((d) => {
        setData(d);
        setProfileForm({
          name: d.tenant.name,
          industry: d.tenant.industry,
          contactEmail: d.tenant.contactEmail,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateOrgProfile(profileForm);
      const d = await api.getOrgPortal();
      setData(d);
      setEditingProfile(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4 py-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted" />
        <h2 className="text-lg font-semibold">No Organization</h2>
        <p className="text-sm text-muted max-w-md mx-auto">{error}</p>
        <p className="text-sm text-muted">
          Create an organization from the{' '}
          <Link to="/organizations" className="text-accent hover:underline">
            Organizations
          </Link>{' '}
          page, or ask your admin to add you to one.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
        >
          <Building2 className="h-4 w-4" /> Register as Organization
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { tenant, stats, members, hiredAgents, recentContracts } = data;
  const PlanIcon = planIcons[tenant.plan] ?? Shield;
  const isOwner = user?.id === tenant.ownerId;

  return (
    <div className="space-y-6">
      {/* Org header */}
      <div className="flex items-start justify-between rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-xl font-bold text-accent">
            {tenant.name.charAt(0)}
          </div>
          <div>
            {editingProfile ? (
              <div className="space-y-2">
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <div className="flex gap-2">
                  <input
                    value={profileForm.industry}
                    onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
                    placeholder="Industry"
                    className="rounded-lg border border-border bg-input px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <input
                    value={profileForm.contactEmail}
                    onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                    placeholder="Contact email"
                    className="rounded-lg border border-border bg-input px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90"
                  >
                    <Save className="h-3 w-3" /> Save
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs text-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{tenant.name}</h2>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${planColors[tenant.plan]}`}>
                    <PlanIcon className="h-3 w-3" />
                    {tenant.plan}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {tenant.industry} &middot; {tenant.slug}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && !editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-accent/40"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          <div className="flex items-center gap-1 text-sm font-semibold text-accent">
            <DollarSign className="h-4 w-4" />
            {stats.balance.toLocaleString()} credits
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'Hired Agents', value: stats.hiredAgents, icon: Bot, color: 'text-accent' },
          { label: 'Active Contracts', value: stats.activeContracts, icon: Briefcase, color: 'text-green-500' },
          { label: 'Completed', value: stats.completedContracts, icon: CheckCircle, color: 'text-accent' },
          { label: 'Total Spend', value: `$${stats.totalSpend.toLocaleString()}`, icon: TrendingUp, color: 'text-yellow-500' },
          { label: 'Members', value: stats.memberCount, icon: Users, color: 'text-blue-500' },
          { label: 'Contract Slots', value: `${stats.activeContracts}/${stats.maxActiveContracts}`, icon: Clock, color: 'text-muted' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <div className="text-lg font-bold">{value}</div>
              <div className="text-[11px] text-muted">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Hired Agents + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hired Agents */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-accent" /> Active Agents
            </h3>
            <Link
              to="/org/agents"
              className="text-xs text-accent hover:underline"
            >
              Manage Agents <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          {hiredAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-2 text-sm text-muted">No agents hired yet.</p>
              <Link
                to="/org/agents"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
              >
                <ShoppingBag className="h-4 w-4" /> Browse Agents
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {hiredAgents.map((agent: any) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {agent.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{agent.name}</h4>
                    <p className="text-[11px] text-muted">{agent.title}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-accent">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {agent.rating}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-blue-500" /> Team Members
          </h3>
          <div className="space-y-2">
            {members.map((m: any) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                  {(m.displayName || m.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">
                    {m.displayName || m.username}
                  </span>
                  <span className="text-[10px] text-muted">{m.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  {m.id === tenant.ownerId && (
                    <span title="Owner"><Crown className="h-3 w-3 text-yellow-500" /></span>
                  )}
                  <span className="rounded-full bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted">
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Contracts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Briefcase className="h-4 w-4" /> Recent Contracts
          </h3>
          <Link
            to="/org/agents"
            className="text-xs text-accent hover:underline"
          >
            View All <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        {recentContracts.length === 0 ? (
          <p className="text-sm text-muted">No contracts yet.</p>
        ) : (
          <div className="space-y-2">
            {recentContracts.map((c: any) => {
              const s = statusStyles[c.status] ?? statusStyles.pending;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>
                    {c.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{c.title}</h4>
                    <p className="text-[11px] text-muted">{c.agentName} &middot; {c.specialty}</p>
                  </div>
                  <div className="text-xs text-muted">
                    ${c.totalCost.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
