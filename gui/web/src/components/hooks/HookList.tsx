import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Webhook, Trash2, Zap } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface Hook {
  id: string;
  name: string;
  event: string;
  type: string;
  config: { url?: string; command?: string };
  enabled: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
}

interface HookListProps {
  hooks: Hook[];
  onToggle: (id: string, enabled: boolean) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
}

const hookTypeColor: Record<string, string> = {
  webhook: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  log: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  script: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

export function HookList({ hooks, onToggle, onTest, onDelete }: HookListProps) {
  if (hooks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Webhook className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm text-muted">No hooks registered yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {hooks.map((h) => (
        <Card key={h.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold truncate">{h.name}</h3>
                <Badge className={hookTypeColor[h.type] ?? ''}>{h.type}</Badge>
                <Badge variant={h.enabled ? 'success' : 'outline'}>
                  {h.enabled ? 'enabled' : 'disabled'}
                </Badge>
              </div>
              <p className="text-xs text-muted">
                Event: <span className="text-foreground">{h.event}</span>
                {' · '}{h.triggerCount} trigger{h.triggerCount !== 1 ? 's' : ''}
                {h.lastTriggeredAt && <>{' · '}Last {formatRelativeTime(h.lastTriggeredAt)}</>}
              </p>
              {h.config.url && <p className="text-xs text-muted truncate mt-0.5">URL: {h.config.url}</p>}
              {h.config.command && <p className="text-xs text-muted truncate mt-0.5">Cmd: {h.config.command}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onToggle(h.id, !h.enabled)}>
                {h.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-accent border-accent/30 hover:bg-accent/10"
                onClick={() => onTest(h.id)}
              >
                <Zap className="h-3 w-3" /> Test
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                onClick={() => onDelete(h.id)}
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
