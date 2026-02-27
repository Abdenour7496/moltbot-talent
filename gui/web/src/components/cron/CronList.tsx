import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, Play } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface CronTask {
  id: string;
  name: string;
  personaId: string;
  schedule: string;
  action: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  lastOutcome?: string;
}

interface CronListProps {
  tasks: CronTask[];
  onToggle: (id: string, enabled: boolean) => void;
  onTrigger: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CronList({ tasks, onToggle, onTrigger, onDelete }: CronListProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm text-muted">No scheduled tasks yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((t) => (
        <Card key={t.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold truncate">{t.name}</h3>
                <Badge variant={t.enabled ? 'success' : 'outline'}>
                  {t.enabled ? 'enabled' : 'disabled'}
                </Badge>
                {t.lastOutcome && (
                  <Badge variant={t.lastOutcome === 'success' ? 'success' : 'destructive'}>
                    {t.lastOutcome}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted">
                <span className="text-foreground font-mono">{t.schedule}</span>
                {' · '}Persona: <span className="text-foreground">{t.personaId}</span>
                {' · '}{t.runCount} run{t.runCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted mt-0.5 truncate">{t.action}</p>
              <p className="text-xs text-muted mt-0.5">
                {t.lastRunAt && <>Last run {formatRelativeTime(t.lastRunAt)}</>}
                {t.nextRunAt && <>{t.lastRunAt ? ' · ' : ''}Next run {formatRelativeTime(t.nextRunAt)}</>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onToggle(t.id, !t.enabled)}>
                {t.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-accent border-accent/30 hover:bg-accent/10"
                onClick={() => onTrigger(t.id)}
              >
                <Play className="h-3 w-3" /> Run
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                onClick={() => onDelete(t.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
