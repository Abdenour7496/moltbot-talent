import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

const HOOK_EVENTS = [
  'persona_loaded',
  'persona_activated',
  'approval_requested',
  'approval_granted',
  'approval_denied',
  'session_created',
  'channel_message',
] as const;

const HOOK_TYPES = ['webhook', 'log', 'script'] as const;

interface HookEditorProps {
  onSubmit: (data: { name: string; event: string; type: string; config: any }) => void;
}

export function HookEditor({ onSubmit }: HookEditorProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [event, setEvent] = useState<string>(HOOK_EVENTS[0]);
  const [type, setType] = useState<string>(HOOK_TYPES[0]);
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Hook
      </Button>
    );
  }

  const handleSubmit = () => {
    if (!name.trim()) return;
    const config: any = {};
    if (type === 'webhook' && url) config.url = url;
    if (type === 'script' && command) config.command = command;
    onSubmit({ name: name.trim(), event, type, config });
    setName('');
    setUrl('');
    setCommand('');
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">New Hook</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Hook name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select
            className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm text-foreground"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          >
            {HOOK_EVENTS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
          </select>
          <select
            className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm text-foreground"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {HOOK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {type === 'webhook' && (
          <Input placeholder="Webhook URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        )}
        {type === 'script' && (
          <Input placeholder="Script command" value={command} onChange={(e) => setCommand(e.target.value)} />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSubmit}>Create</Button>
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
