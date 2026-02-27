import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface Session {
  id: string;
  label: string;
  personaId: string;
  status: string;
  messages: Message[];
  createdAt: string;
  lastActivityAt: string;
}

interface SessionDetailProps {
  session: Session;
  onBack: () => void;
  onSendMessage: (content: string) => void;
}

const roleBg = (role: string) =>
  role === 'user'
    ? 'bg-accent/10 border-accent/20'
    : role === 'persona'
      ? 'bg-card border-border'
      : 'bg-amber-400/5 border-amber-400/20';

export function SessionDetail({ session, onBack, onSendMessage }: SessionDetailProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="text-lg font-semibold">{session.label}</h2>
        <Badge variant={session.status === 'active' ? 'success' : session.status === 'idle' ? 'warning' : 'outline'}>
          {session.status}
        </Badge>
        <span className="text-xs text-muted ml-auto">Persona: {session.personaId}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
          {session.messages.length === 0 && (
            <p className="text-sm text-muted text-center py-8">No messages yet.</p>
          )}
          {session.messages.map((m) => (
            <div
              key={m.id}
              className={cn('rounded-md border p-3', roleBg(m.role))}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {m.role}
                </Badge>
                <span className="text-[10px] text-muted">{formatDate(m.timestamp)}</span>
              </div>
              <p className="text-sm">{m.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {session.status !== 'closed' && (
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      )}
    </div>
  );
}
