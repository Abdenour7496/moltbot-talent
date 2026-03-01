import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Bot,
  Search,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  Loader2,
  Filter,
  MessageSquare,
  Target,
} from 'lucide-react';

type Tab = 'browse' | 'assigned';

interface AgentListing {
  id: string;
  name: string;
  title: string;
  specialty: string;
  description: string;
  avatar: string;
  rating: number;
  completedProjects: number;
  availability: string;
  skills: string[];
}

const statusStyles: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  active: { bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle },
  paused: { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: Pause },
  completed: { bg: 'bg-accent/10', text: 'text-accent', icon: CheckCircle },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', icon: XCircle },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock },
};

export function OrgAgentsPage() {
  const [tab, setTab] = useState<Tab>('browse');
  const [agents, setAgents] = useState<AgentListing[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
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

  const loadAssigned = useCallback(async () => {
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
    else loadAssigned();
  }, [tab, loadBrowse, loadAssigned]);

  const specialties = Array.from(new Set(agents.map((a) => a.specialty))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex items-center gap-4 border-b border-border pb-3">
        {(['browse', 'assigned'] as Tab[]).map((t) => (
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
                <Bot className="h-4 w-4" /> Browse Agents
              </>
            ) : (
              <>
                <Briefcase className="h-4 w-4" /> Assigned Agents
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
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-500`}>
                      {agent.availability}
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
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{agent.completedProjects} projects</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- ASSIGNED TAB ---- */}
      {tab === 'assigned' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Briefcase className="mx-auto h-10 w-10 text-muted" />
              <p className="mt-3 text-sm text-muted">No agents assigned yet.</p>
              <button
                onClick={() => setTab('browse')}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
              >
                <Bot className="h-4 w-4" /> Browse Agents
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

    </div>
  );
}
