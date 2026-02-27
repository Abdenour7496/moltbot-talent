import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Activity,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface WorkflowSummary {
  id: string;
  workflowName: string;
  task: string;
  status: string;
  progress: number;
  stepsCompleted: number;
  stepsTotal: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowsWidgetProps {
  workflows: WorkflowSummary[];
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    case 'escalated':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted" />;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="success">{status}</Badge>;
    case 'running':
      return (
        <Badge variant="outline" className="border-blue-400/40 text-blue-400">
          {status}
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">{status}</Badge>;
    case 'escalated':
      return (
        <Badge
          variant="destructive"
          className="bg-amber-500/20 text-amber-400 border-amber-500/30"
        >
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function progressBarColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-400';
    case 'running':
      return 'bg-blue-400';
    case 'failed':
      return 'bg-red-400';
    case 'escalated':
      return 'bg-amber-400';
    default:
      return 'bg-muted';
  }
}

export function WorkflowsWidget({ workflows }: WorkflowsWidgetProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Activity className="h-4 w-4" /> Workflows
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/workflows')}
          className="text-xs gap-1"
        >
          View All <ExternalLink className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">No workflow runs yet.</p>
        ) : (
          <div className="space-y-3">
            {workflows.map((w) => (
              <div
                key={w.id}
                className="rounded-md border border-border p-3 hover:bg-hover cursor-pointer transition-colors"
                onClick={() => navigate('/workflows')}
              >
                <div className="flex items-center gap-2 mb-1">
                  {statusIcon(w.status)}
                  <span className="text-sm font-medium truncate flex-1">
                    {w.workflowName}
                  </span>
                  {statusBadge(w.status)}
                </div>
                <p className="text-xs text-muted truncate mb-2">{w.task}</p>
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        progressBarColor(w.status),
                      )}
                      style={{ width: `${w.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted shrink-0">
                    {w.stepsCompleted}/{w.stepsTotal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
