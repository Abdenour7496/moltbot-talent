import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  Play,
  MessageSquare,
  Send,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
  Star,
  AlertTriangle,
  Timer,
  Milestone,
  Plus,
  Trash2,
  BarChart3,
  TrendingUp,
  Hash,
  X,
  Building2,
} from 'lucide-react';

interface ContractMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  completedAt?: string;
  amount: number;
}

interface ContractMessage {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  timestamp: string;
}

interface Contract {
  id: string;
  tenantId: string;
  agentId: string;
  clientUserId: string;
  departmentId?: string;
  departmentName?: string;
  title: string;
  description: string;
  specialty: string;
  status: string;
  hourlyRate: number;
  estimatedHours: number;
  actualHours: number;
  totalCost: number;
  milestones: ContractMilestone[];
  messages: ContractMessage[];
  rating?: number;
  feedback?: string;
  startedAt: string;
  completedAt?: string;
  agentName?: string;
}

interface ContractStats {
  total: number;
  byStatus: Record<string, number>;
  totalCost: number;
  totalHours: number;
  totalEstimated: number;
  avgRating: number | null;
}

interface AgentOption {
  id: string;
  name: string;
  specialty: string;
  hourlyRate: number;
}

interface DepartmentOption {
  id: string;
  name: string;
}

const statusStyles: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock },
  active: { bg: 'bg-green-500/10', text: 'text-green-500', icon: Play },
  paused: { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: Pause },
  review: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: AlertTriangle },
  completed: { bg: 'bg-accent/10', text: 'text-accent', icon: CheckCircle },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', icon: XCircle },
  disputed: { bg: 'bg-red-500/10', text: 'text-red-500', icon: AlertTriangle },
};

export function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [completeModal, setCompleteModal] = useState<Contract | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [hoursInput, setHoursInput] = useState<Record<string, number>>({});
  const [actionError, setActionError] = useState('');

  // ── Create modal state ──
  const [showCreate, setShowCreate] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    agentId: '',
    departmentId: '',
    specialty: '',
    hourlyRate: 0,
    estimatedHours: 0,
  });
  const [createMilestones, setCreateMilestones] = useState<{ title: string; description: string; dueDate: string; amount: number }[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  // ── Monitor stats state ──
  const [stats, setStats] = useState<ContractStats | null>(null);

  // ── Department state ──
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [deptFilter, setDeptFilter] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (deptFilter) params.set('departmentId', deptFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    api.getContracts(qs).then(setContracts).finally(() => setLoading(false));
    api.getContractStats().then(setStats).catch(() => {});
    api.getTenants().then(setDepartments).catch(() => {});
  };

  useEffect(load, [statusFilter, deptFilter]);

  const openCreate = () => {
    api.getAgents('?availability=available').then(setAgents).catch(() =>
      api.getAgents().then(setAgents).catch(() => {}),
    );
    setCreateForm({ title: '', description: '', agentId: '', departmentId: '', specialty: '', hourlyRate: 0, estimatedHours: 0 });
    setCreateMilestones([]);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.agentId) {
      setActionError('Title and agent are required');
      return;
    }
    setCreateLoading(true);
    try {
      await api.createContract({
        ...createForm,
        milestones: createMilestones.filter((m) => m.title.trim()),
      });
      setShowCreate(false);
      load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to create contract');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAgentSelect = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    setCreateForm((prev) => ({
      ...prev,
      agentId,
      specialty: agent?.specialty ?? prev.specialty,
      hourlyRate: agent?.hourlyRate ?? prev.hourlyRate,
    }));
  };

  const addMilestone = () => {
    setCreateMilestones((prev) => [...prev, { title: '', description: '', dueDate: '', amount: 0 }]);
  };

  const updateMilestone = (idx: number, field: string, value: any) => {
    setCreateMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const removeMilestone = (idx: number) => {
    setCreateMilestones((prev) => prev.filter((_, i) => i !== idx));
  };

  const deleteContract = async (id: string) => {
    if (!confirm('Delete this contract? This action cannot be undone.')) return;
    try {
      await api.deleteContract(id);
      load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to delete contract');
    }
  };

  const sendMessage = async (contractId: string) => {
    if (!message.trim()) return;
    try {
      await api.sendContractMessage(contractId, { content: message });
      setMessage('');
      load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to send message');
    }
  };

  const complete = async () => {
    if (!completeModal) return;
    try {
      await api.completeContract(completeModal.id, { rating, feedback });
      setCompleteModal(null);
      load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to complete contract');
    }
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancel this contract?')) return;
    try {
      await api.cancelContract(id);
      load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to cancel contract');
    }
  };

  const pause = async (id: string) => {
    try {
      await api.pauseContract(id);
      load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to pause contract');
    }
  };

  const resume = async (id: string) => {
    try {
      await api.resumeContract(id);
      load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to resume contract');
    }
  };

  const logHours = async (id: string) => {
    const h = hoursInput[id];
    if (!h || h <= 0) return;
    try {
      await api.logContractHours(id, { hours: h });
      setHoursInput((prev) => ({ ...prev, [id]: 0 }));
      load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to log hours');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const counts = contracts.reduce((a, c) => {
    a[c.status] = (a[c.status] || 0) + 1;
    return a;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-4 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* ── Monitoring Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Hash className="h-3 w-3" /> Total</div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Play className="h-3 w-3 text-green-500" /> Active</div>
            <p className="text-2xl font-bold text-green-500">{stats.byStatus.active || 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Clock className="h-3 w-3 text-yellow-500" /> Pending</div>
            <p className="text-2xl font-bold text-yellow-500">{stats.byStatus.pending || 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted"><DollarSign className="h-3 w-3 text-accent" /> Total Cost</div>
            <p className="text-2xl font-bold">${stats.totalCost.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Timer className="h-3 w-3" /> Hours Logged</div>
            <p className="text-2xl font-bold">{stats.totalHours.toLocaleString()}h</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Star className="h-3 w-3 text-yellow-500" /> Avg Rating</div>
            <p className="text-2xl font-bold">{stats.avgRating ?? '—'}</p>
          </div>
        </div>
      )}

      {/* ── Header with Create button ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5" /> Contracts
        </h2>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" /> New Contract
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap items-center gap-2">
        {['active', 'pending', 'paused', 'review', 'completed', 'cancelled'].map((s) => {
          const style = statusStyles[s];
          const Icon = style?.icon ?? Clock;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-accent text-accent-foreground'
                  : `${style?.bg} ${style?.text}`
              }`}
            >
              <Icon className="h-3 w-3" />
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] || 0})
            </button>
          );
        })}

        {/* Department filter */}
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="ml-auto rounded-lg border border-border bg-input px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Contracts list */}
      <div className="space-y-3">
        {contracts.map((c) => {
          const style = statusStyles[c.status] ?? statusStyles.pending;
          const StatusIcon = style.icon;
          const isExpanded = expanded === c.id;

          return (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/5"
                onClick={() => setExpanded(isExpanded ? null : c.id)}
              >
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                  <StatusIcon className="h-3 w-3" />
                  {c.status}
                </span>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{c.title}</h3>
                  <p className="text-xs text-muted">
                    Agent: {c.agentName ?? c.agentId} &middot; {c.specialty}
                    {c.departmentName && (
                      <> &middot; <Building2 className="inline h-3 w-3" /> {c.departmentName}</>                    
                    )}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {c.actualHours}/{c.estimatedHours}h
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${c.totalCost.toLocaleString()}
                  </span>
                  {c.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {c.rating}
                    </span>
                  )}
                </div>

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted" />
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-muted">{c.description}</p>

                  {/* Department assignment */}
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted" />
                    <span className="text-xs font-medium text-muted">Department:</span>
                    <select
                      value={c.departmentId ?? ''}
                      onChange={async (e) => {
                        try {
                          await api.updateContract(c.id, { departmentId: e.target.value || null });
                          load();
                        } catch (err: any) {
                          setActionError(err.message ?? 'Failed to update department');
                        }
                      }}
                      className="rounded-lg border border-border bg-input px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action buttons */}
                  {(c.status === 'active' || c.status === 'paused') && (
                    <div className="flex flex-wrap gap-2">
                      {c.status === 'active' && (
                        <>
                          <button
                            onClick={() => setCompleteModal(c)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3" /> Complete
                          </button>
                          <button
                            onClick={() => pause(c.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-500 hover:bg-orange-500/20"
                          >
                            <Pause className="h-3 w-3" /> Pause
                          </button>
                        </>
                      )}
                      {c.status === 'paused' && (
                        <button
                          onClick={() => resume(c.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20"
                        >
                          <Play className="h-3 w-3" /> Resume
                        </button>
                      )}
                      <button
                        onClick={() => cancel(c.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                      >
                        <XCircle className="h-3 w-3" /> Cancel
                      </button>
                    </div>
                  )}

                  {/* Delete button for inactive contracts */}
                  {(c.status === 'pending' || c.status === 'completed' || c.status === 'cancelled') && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => deleteContract(c.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  )}

                  {/* Hours logging */}
                  {c.status === 'active' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="Hours..."
                        value={hoursInput[c.id] || ''}
                        onChange={(e) =>
                          setHoursInput((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                        }
                        className="w-24 rounded-lg border border-border bg-input px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <button
                        onClick={() => logHours(c.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                      >
                        <Timer className="h-3 w-3" /> Log Hours
                      </button>
                    </div>
                  )}

                  {/* Milestones */}
                  {c.milestones.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1 text-sm font-semibold">
                        <Milestone className="h-4 w-4" /> Milestones
                      </h4>
                      <div className="space-y-1">
                        {c.milestones.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-lg bg-muted/5 px-3 py-2 text-xs"
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                m.status === 'completed'
                                  ? 'bg-green-500'
                                  : m.status === 'in-progress'
                                  ? 'bg-yellow-500'
                                  : 'bg-muted'
                              }`}
                            />
                            <span className="flex-1 font-medium">{m.title}</span>
                            <span className="text-muted">${m.amount}</span>
                            <span className="text-muted">{m.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-1 text-sm font-semibold">
                      <MessageSquare className="h-4 w-4" /> Messages ({c.messages.length})
                    </h4>
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg bg-muted/5 p-3">
                      {c.messages.map((m) => (
                        <div key={m.id} className="text-xs">
                          <span
                            className={`font-medium ${
                              m.senderType === 'agent'
                                ? 'text-accent'
                                : m.senderType === 'system'
                                ? 'text-muted'
                                : 'text-foreground'
                            }`}
                          >
                            [{m.senderType}]
                          </span>{' '}
                          <span className="text-muted">
                            {new Date(m.timestamp).toLocaleString()}
                          </span>
                          <p className="mt-0.5">{m.content}</p>
                        </div>
                      ))}
                      {c.messages.length === 0 && (
                        <p className="text-xs text-muted">No messages yet.</p>
                      )}
                    </div>
                    {(c.status === 'active' || c.status === 'paused') && (
                      <div className="flex gap-2">
                        <input
                          placeholder="Type a message..."
                          value={expanded === c.id ? message : ''}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && sendMessage(c.id)
                          }
                          className="flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                        <button
                          onClick={() => sendMessage(c.id)}
                          className="rounded-lg bg-accent px-3 py-1.5 text-sm text-accent-foreground hover:bg-accent/90"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Completed feedback */}
                  {c.status === 'completed' && c.feedback && (
                    <div className="rounded-lg bg-accent/5 p-3 text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        <Star className="h-3 w-3 text-yellow-500" />
                        Rating: {c.rating}/5
                      </div>
                      <p className="mt-1 text-muted">{c.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {contracts.length === 0 && (
        <div className="py-16 text-center text-sm text-muted">
          No contracts found.
        </div>
      )}

      {/* Complete modal */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Complete Contract</h2>
            <p className="text-xs text-muted">{completeModal.title}</p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className={`p-1 ${n <= rating ? 'text-yellow-500' : 'text-muted'}`}
                    >
                      <Star className="h-5 w-5" fill={n <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Feedback</label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="How was working with this agent?"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={complete}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" /> Confirm Completion
              </button>
              <button
                onClick={() => setCompleteModal(null)}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Contract Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5" /> Create New Contract
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Title *</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Contract title..."
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              {/* Agent */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Agent *</label>
                <select
                  value={createForm.agentId}
                  onChange={(e) => handleAgentSelect(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.specialty} (${a.hourlyRate}/h)
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Department</label>
                <select
                  value={createForm.departmentId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, departmentId: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What work needs to be done?"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>

              {/* Rate & Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Hourly Rate ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.hourlyRate || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, hourlyRate: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Estimated Hours</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.estimatedHours || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, estimatedHours: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Milestone className="h-4 w-4" /> Milestones
                  </label>
                  <button
                    onClick={addMilestone}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {createMilestones.map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={m.title}
                        onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                        placeholder="Milestone title"
                        className="flex-1 rounded-lg border border-border bg-input px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <button onClick={() => removeMilestone(idx)} className="text-muted hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={m.dueDate}
                        onChange={(e) => updateMilestone(idx, 'dueDate', e.target.value)}
                        className="rounded-lg border border-border bg-input px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Amount ($)"
                        value={m.amount || ''}
                        onChange={(e) => updateMilestone(idx, 'amount', Number(e.target.value))}
                        className="rounded-lg border border-border bg-input px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Contract
              </button>
              <button
                onClick={() => setShowCreate(false)}
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
