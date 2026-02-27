import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Trash2, Zap } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  type: string;
  personaId: string;
  config: Record<string, string>;
  active: boolean;
  createdAt: string;
  lastMessageAt?: string;
}

interface ChannelListProps {
  channels: Channel[];
  onToggle: (id: string, active: boolean) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeColor: Record<string, string> = {
  slack: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  discord: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  teams: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  webhook: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  telegram: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
};

export function ChannelList({ channels, onToggle, onTest, onDelete }: ChannelListProps) {
  if (channels.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Radio className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm text-muted">No channels configured yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {channels.map((ch) => (
        <Card key={ch.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold truncate">{ch.name}</h3>
                <Badge className={typeColor[ch.type] ?? ''}>{ch.type}</Badge>
                <Badge variant={ch.active ? 'success' : 'outline'}>
                  {ch.active ? 'active' : 'inactive'}
                </Badge>
              </div>
              <p className="text-xs text-muted">
                Persona: <span className="text-foreground">{ch.personaId}</span>
                {ch.lastMessageAt && <>{' · '}Last message {formatRelativeTime(ch.lastMessageAt)}</>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggle(ch.id, !ch.active)}
              >
                {ch.active ? 'Disable' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-accent border-accent/30 hover:bg-accent/10"
                onClick={() => onTest(ch.id)}
              >
                <Zap className="h-3 w-3" /> Test
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                onClick={() => onDelete(ch.id)}
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
