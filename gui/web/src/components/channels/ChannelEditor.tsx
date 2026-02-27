import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

const CHANNEL_TYPES = ['slack', 'discord', 'teams', 'webhook', 'telegram'] as const;

interface ChannelEditorProps {
  personas: string[];
  onSubmit: (data: { name: string; type: string; personaId: string; config: Record<string, string> }) => void;
}

export function ChannelEditor({ personas, onSubmit }: ChannelEditorProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(CHANNEL_TYPES[0]);
  const [personaId, setPersonaId] = useState(personas[0] ?? '');
  const [configKey, setConfigKey] = useState('');
  const [configVal, setConfigVal] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Channel
      </Button>
    );
  }

  const addConfigEntry = () => {
    if (!configKey.trim()) return;
    setConfig({ ...config, [configKey.trim()]: configVal });
    setConfigKey('');
    setConfigVal('');
  };

  const handleSubmit = () => {
    if (!name.trim() || !personaId) return;
    onSubmit({ name: name.trim(), type, personaId, config });
    setName('');
    setConfig({});
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">New Channel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Channel name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select
            className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm text-foreground"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {CHANNEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm text-foreground"
            value={personaId}
            onChange={(e) => setPersonaId(e.target.value)}
          >
            {personas.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Config key" value={configKey} onChange={(e) => setConfigKey(e.target.value)} className="flex-1" />
          <Input placeholder="Config value" value={configVal} onChange={(e) => setConfigVal(e.target.value)} className="flex-1" />
          <Button size="sm" variant="outline" onClick={addConfigEntry}>Add</Button>
        </div>
        {Object.keys(config).length > 0 && (
          <div className="text-xs text-muted space-y-1">
            {Object.entries(config).map(([k, v]) => (
              <div key={k}><span className="text-foreground">{k}</span>: {v}</div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSubmit}>Create</Button>
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
