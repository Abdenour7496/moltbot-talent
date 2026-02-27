import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

interface CronEditorProps {
  personas: string[];
  onSubmit: (data: { name: string; personaId: string; schedule: string; action: string }) => void;
}

export function CronEditor({ personas, onSubmit }: CronEditorProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [personaId, setPersonaId] = useState(personas[0] ?? '');
  const [schedule, setSchedule] = useState('');
  const [action, setAction] = useState('');

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Task
      </Button>
    );
  }

  const handleSubmit = () => {
    if (!name.trim() || !personaId || !schedule.trim() || !action.trim()) return;
    onSubmit({ name: name.trim(), personaId, schedule: schedule.trim(), action: action.trim() });
    setName('');
    setSchedule('');
    setAction('');
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">New Scheduled Task</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Task name" value={name} onChange={(e) => setName(e.target.value)} />
        <select
          className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm text-foreground"
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
        >
          {personas.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <Input placeholder="Cron schedule (e.g. */15 * * * *)" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        <Input placeholder="Action description" value={action} onChange={(e) => setAction(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSubmit}>Create</Button>
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
