import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

interface SessionCreateProps {
  personas: string[];
  onSubmit: (data: { label: string; personaId: string }) => void;
}

export function SessionCreate({ personas, onSubmit }: SessionCreateProps) {
  const [label, setLabel] = useState('');
  const [personaId, setPersonaId] = useState(personas[0] ?? '');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Session
      </Button>
    );
  }

  const handleSubmit = () => {
    if (!label.trim() || !personaId) return;
    onSubmit({ label: label.trim(), personaId });
    setLabel('');
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">New Session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Session label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select
          className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
        >
          {personas.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSubmit}>Create</Button>
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
