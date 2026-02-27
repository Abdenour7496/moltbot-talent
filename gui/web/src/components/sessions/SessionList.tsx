import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface Session {
  id: string;
  label: string;
  personaId: string;
  status: string;
  messages: any[];
  createdAt: string;
  lastActivityAt: string;
}

interface SessionListProps {
  sessions: Session[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusVariant = (s: string) =>
  s === 'active' ? 'success' : s === 'idle' ? 'warning' : 'outline';

export function SessionList({ sessions, onSelect, onDelete }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm text-muted">No sessions yet. Create one to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <Card
          key={s.id}
          className="cursor-pointer hover:border-accent/50 transition-colors"
          onClick={() => onSelect(s.id)}
        >
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold truncate">{s.label}</h3>
                <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
              </div>
              <p className="text-xs text-muted">
                Persona: <span className="text-foreground">{s.personaId}</span>
                {' · '}{s.messages.length} message{s.messages.length !== 1 ? 's' : ''}
                {' · '}Last activity {formatRelativeTime(s.lastActivityAt)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-red-400 border-red-400/30 hover:bg-red-400/10 shrink-0"
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
