import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Bot,
  Search,
  Star,
  DollarSign,
  ShoppingCart,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  Loader2,
  Filter,
  ArrowRight,
  X,
  Users,
  MessageSquare,
  Target,
  Zap,
  Eye,
} from 'lucide-react';

type Tab = 'browse' | 'hired';

interface AgentListing {
  id: string;
  name: string;
  title: string;
  specialty: string;
  description: string;
  avatar: string;
  hourlyRate: number;
  rating: number;
  completedProjects: number;
  availability: string;
  skills: string[];
  tier: string;
}

interface HireModalPayload {
  agent: AgentListing;
}

const statusStyles: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  active: { bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle },
  paused: { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: Pause },
  completed: { bg: 'bg-accent/10', text: 'text-accent', icon: CheckCircle },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', icon: XCircle },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock },
};

const tierColors: Record<string, string> = {
  standard: 'bg-muted/20 text-muted',
  professional: 'bg-blue-500/10 text-blue-500',
  specialist: 'bg-accent/10 text-accent',
  elite: 'bg-yellow-500/10 text-yellow-500',
};

export function OrgAgentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('browse');
  const [agents, setAgents] = useState<AgentListing[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [hireModal, setHireModal] = useState<HireModalPayload | null>(null);
  const [hireForm, setHireForm] = useState({ title: '', description: '', durationWeeks: 4 });
  const [hiring, setHiring] = useState(false);
  const [error, setError] = useState('');

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    try {
      const qs: Record<string, string> = {};
      if (search) qs.search = search;
      if (specialtyFilter) qs.specialty = specialtyFilter;
      const res = await api.getOrgAvailableAgents(qs);
      setAgents(Array.isArray(res) ? res : (res as any).agents ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, specialtyFilter]);

  const loadHired = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrgAgents();
      setContracts(Array.isArray(res) ? res : (res as any).agents ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'browse') loadBrowse();
    else loadHired();
  }, [tab, loadBrowse, loadHired]);

  const handleHire = async () => {
    if (!hireModal) return;
    setHiring(true);
    try {
      await api.orgHireAgent(hireModal.agent.id, {
        title: hireForm.title || `Hire ${hireModal.agent.name}`,
        description: hireForm.description || `Hired via organization portal`,
        durationWeeks: hireForm.durationWeeks,
        estimatedHours: hireForm.durationWeeks * 40,
      });
      setHireModal(null);
      setHireForm({ title: '', description: '', durationWeeks: 4 });
      setTab('hired');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setHiring(false);
    }
  };

  const specialties = Array.from(new Set(agents.map((a) => a.specialty))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex items-center gap-4 border-b border-border pb-3">
        {(['browse', 'hired'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:text-foreground hover:bg-muted/10'
            }`}
          >
            {t === 'browse' ? (
              <>
                <ShoppingCart className="h-4 w-4" /> Browse &amp; Hire
              </>
            ) : (
              <>
                <Briefcase className="h-4 w-4" /> My Agents
              </>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ---- BROWSE TAB ---- */}
      {tab === 'browse' && (
        <div className="space-y-4">
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
            <button
              onClick={loadBrowse}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-foreground hover:border-accent/40"
            >
              Refresh
            </button>
          </div>

          {/* Agent grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : agents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Bot className="mx-auto h-10 w-10 text-muted" />
              <p className="mt-3 text-sm text-muted">No agents match your filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
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
                      <p className="text-[11px] text-muted">{agent.title}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tierColors[agent.tier] ?? tierColors.standard}`}>
                      {agent.tier}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-3 line-clamp-2 text-xs text-muted">{agent.description}</p>

                  {/* Skills */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(agent.skills ?? []).slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-muted/10 px-2 py-0.5 text-[10px] text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-3 w-3" /> {agent.rating}
                      </span>
                      <span className="text-muted">{agent.completedProjects} projects</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-accent">
                        ${agent.hourlyRate}/hr
                      </span>
                      <button
                        onClick={() => setHireModal({ agent })}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
                      >
                        <Zap className="h-3 w-3" /> Hire
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- HIRED TAB ---- */}
      {tab === 'hired' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Briefcase className="mx-auto h-10 w-10 text-muted" />
              <p className="mt-3 text-sm text-muted">You haven't hired any agents yet.</p>
              <button
                onClick={() => setTab('browse')}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
              >
                <ShoppingCart className="h-4 w-4" /> Browse Agents
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((c: any) => {
                const st = statusStyles[c.status] ?? statusStyles.pending;
                const StIcon = st.icon;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-border bg-card p-4 hover:border-accent/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                        {(c.agentName ?? c.title ?? '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate">{c.agentName ?? c.title}</h4>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}>
                            <StIcon className="h-3 w-3" />
                            {c.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted">{c.specialty ?? c.description}</p>
                        <p className="text-[11px] text-muted mt-1">{c.title}</p>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-semibold text-accent">${(c.totalCost ?? 0).toLocaleString()}</div>
                        <div className="text-muted">{c.durationWeeks ?? '–'} wks</div>
                      </div>
                    </div>

                    {/* Milestones summary */}
                    {c.milestones && c.milestones.length > 0 && (
                      <div className="mt-3 flex gap-1">
                        {c.milestones.map((m: any, i: number) => (
                          <div
                            key={i}
                            title={m.title}
                            className={`h-1.5 flex-1 rounded-full ${
                              m.status === 'completed'
                                ? 'bg-accent'
                                : m.status === 'in-progress'
                                ? 'bg-accent/40'
                                : 'bg-border'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {c.milestones?.filter((m: any) => m.status === 'completed').length ?? 0}/
                        {c.milestones?.length ?? 0} milestones
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {c.messages?.length ?? 0} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- HIRE MODAL ---- */}
      {hireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <button
              onClick={() => setHireModal(null)}
              className="absolute right-3 top-3 text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" /> Hire {hireModal.agent.name}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {hireModal.agent.title} &middot; ${hireModal.agent.hourlyRate}/hr
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Contract Title</label>
                <input
                  value={hireForm.title}
                  onChange={(e) => setHireForm({ ...hireForm, title: e.target.value })}
                  placeholder={`Hire ${hireModal.agent.name}`}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  value={hireForm.description}
                  onChange={(e) => setHireForm({ ...hireForm, description: e.target.value })}
                  placeholder="Describe which tasks this agent should handle…"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Duration (weeks)</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={hireForm.durationWeeks}
                  onChange={(e) => setHireForm({ ...hireForm, durationWeeks: parseInt(e.target.value) || 4 })}
                  className="w-24 rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Estimated cost</span>
                  <span className="font-semibold text-accent">
                    ${(hireModal.agent.hourlyRate * 40 * hireForm.durationWeeks).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted">Rate</span>
                  <span>${hireModal.agent.hourlyRate}/hr &times; 40hr/wk &times; {hireForm.durationWeeks} wks</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setHireModal(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleHire}
                disabled={hiring}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {hiring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Confirm Hire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
