import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  Ban,
  Bot,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

interface WorkflowStep {
  stepId: string;
  agentId: string;
  status: string;
  attempts: number;
  output?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  task: string;
  status: string;
  steps: WorkflowStep[];
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/* ── Status helpers ────────────────────────────────────────────── */

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
    case 'done':
      return <Badge variant="success">{status}</Badge>;
    case 'running':
      return (
        <Badge variant="outline" className="border-blue-400 text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          {status}
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="text-muted">
          {status}
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">{status}</Badge>;
    case 'escalated':
      return (
        <Badge variant="destructive" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          {status}
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="text-muted border-muted/50">
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-muted" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'escalated':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case 'cancelled':
      return <Ban className="h-4 w-4 text-muted" />;
    default:
      return <Clock className="h-4 w-4 text-muted" />;
  }
}

function elapsed(start?: string, end?: string): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.round((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

/* ── Component ─────────────────────────────────────────────────── */

export function WorkflowDashboardPage() {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const {
    data: runs,
    loading,
    error,
    refetch,
  } = useApi<WorkflowRun[]>(
    () => api.getWorkflowRuns(filterStatus || undefined),
    [filterStatus],
  );

  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedRun((prev) => (prev === id ? null : id));
  }, []);

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await api.cancelWorkflowRun(id);
        refetch();
      } catch {
        /* swallow */
      }
    },
    [refetch],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.deleteWorkflowRun(id);
        refetch();
      } catch {
        /* swallow */
      }
    },
    [refetch],
  );

  /* ── Summary counters ──────────────────────────────────────── */
  const counts = {
    total: runs?.length ?? 0,
    running: runs?.filter((r) => r.status === 'running').length ?? 0,
    completed: runs?.filter((r) => r.status === 'completed').length ?? 0,
    failed: runs?.filter((r) => r.status === 'failed').length ?? 0,
    escalated: runs?.filter((r) => r.status === 'escalated').length ?? 0,
    cancelled: runs?.filter((r) => r.status === 'cancelled').length ?? 0,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold">Workflow Dashboard</h2>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-[160px]"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="escalated">Escalated</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: counts.total, cls: '' },
          { label: 'Running', value: counts.running, cls: 'text-blue-400' },
          { label: 'Completed', value: counts.completed, cls: 'text-green-400' },
          { label: 'Failed', value: counts.failed, cls: 'text-red-400' },
          { label: 'Escalated', value: counts.escalated, cls: 'text-amber-400' },
          { label: 'Cancelled', value: counts.cancelled, cls: 'text-muted' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted">{c.label}</p>
              <p className={cn('text-2xl font-bold', c.cls)}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Runs list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-8">{error}</p>
      ) : !runs || runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            No workflow runs found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const isExpanded = expandedRun === run.id;
            const completedSteps = run.steps.filter(
              (s) => s.status === 'done' || s.status === 'completed',
            ).length;
            const progressPct =
              run.steps.length > 0
                ? Math.round((completedSteps / run.steps.length) * 100)
                : 0;

            return (
              <Card key={run.id}>
                {/* Run header */}
                <button
                  onClick={() => toggleExpand(run.id)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-semibold truncate">
                            {run.workflowName}
                          </CardTitle>
                          {statusBadge(run.status)}
                        </div>
                        <p className="text-xs text-muted mt-0.5 truncate">
                          {run.task}
                        </p>
                      </div>
                      <div className="text-right shrink-0 text-[11px] text-muted space-y-0.5">
                        <p>{new Date(run.createdAt).toLocaleString()}</p>
                        <p>
                          {completedSteps}/{run.steps.length} steps &middot;{' '}
                          {progressPct}%
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          run.status === 'completed'
                            ? 'bg-green-400'
                            : run.status === 'failed'
                              ? 'bg-red-400'
                              : run.status === 'escalated'
                                ? 'bg-amber-400'
                                : 'bg-blue-400',
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </CardHeader>
                </button>

                {/* Expanded steps */}
                {isExpanded && (
                  <CardContent className="pt-0 space-y-2">
                    <div className="border-t border-border pt-3 mt-1 space-y-2">
                      {run.steps.map((step, idx) => (
                        <div
                          key={step.stepId}
                          className={cn(
                            'flex items-start gap-3 rounded-md border p-3 text-sm',
                            step.status === 'done'
                              ? 'border-green-400/20 bg-green-400/5'
                              : step.status === 'running'
                                ? 'border-blue-400/20 bg-blue-400/5'
                                : step.status === 'failed'
                                  ? 'border-red-400/20 bg-red-400/5'
                                  : step.status === 'escalated'
                                    ? 'border-amber-400/20 bg-amber-400/5'
                                    : 'border-border',
                          )}
                        >
                          <div className="pt-0.5">{statusIcon(step.status)}</div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {idx + 1}. {step.stepId}
                              </span>
                              <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                                <Bot className="h-3 w-3" />
                                {step.agentId}
                              </Badge>
                              {step.attempts > 1 && (
                                <span className="text-[10px] text-muted">
                                  ({step.attempts} attempts)
                                </span>
                              )}
                            </div>
                            {step.output && (
                              <p className="text-xs text-muted">{step.output}</p>
                            )}
                            {step.error && (
                              <p className="text-xs text-red-400">{step.error}</p>
                            )}
                          </div>
                          <div className="text-[10px] text-muted text-right shrink-0 space-y-0.5">
                            {step.startedAt && (
                              <p>
                                Duration:{' '}
                                {elapsed(step.startedAt, step.completedAt)}
                              </p>
                            )}
                            {statusBadge(step.status)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Variables */}
                    {Object.keys(run.variables).length > 0 && (
                      <div className="border-t border-border pt-2 mt-2">
                        <p className="text-xs text-muted mb-1 font-medium">
                          Variables
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                          {Object.entries(run.variables).map(([k, v]) => (
                            <div key={k} className="flex gap-1">
                              <span className="text-muted">{k}:</span>
                              <span className="truncate">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border mt-2">
                      {(run.status === 'pending' || run.status === 'running') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(run.id)}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(run.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
