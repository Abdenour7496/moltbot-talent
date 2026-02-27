import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';

interface LlmEditorProps {
  initial?: {
    id: string;
    label: string;
    provider: string;
    model: string;
    endpoint?: string;
    apiKey?: string;
    parameters: { temperature: number; maxTokens: number; topP?: number };
    role: string;
    priority: number;
    enabled: boolean;
  };
  onSave: (data: any) => void;
  onCancel: () => void;
}

const PROVIDERS = ['openai', 'anthropic', 'google', 'ollama', 'azure', 'custom'] as const;
const NEEDS_ENDPOINT = new Set(['ollama', 'azure', 'custom']);

export function LlmEditor({ initial, onSave, onCancel }: LlmEditorProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [provider, setProvider] = useState(initial?.provider ?? 'openai');
  const [model, setModel] = useState(initial?.model ?? '');
  const [endpoint, setEndpoint] = useState(initial?.endpoint ?? '');
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [temperature, setTemperature] = useState(initial?.parameters?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(initial?.parameters?.maxTokens ?? 4096);
  const [topP, setTopP] = useState(initial?.parameters?.topP ?? undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      label,
      provider,
      model,
      endpoint: NEEDS_ENDPOINT.has(provider) ? endpoint : undefined,
      apiKey: apiKey || undefined,
      parameters: {
        temperature,
        maxTokens,
        ...(topP !== undefined ? { topP } : {}),
      },
      role,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{initial ? 'Edit LLM' : 'Add LLM'}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted mb-1 block">Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. GPT-4o (Primary)" required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted mb-1 block">Provider</label>
              <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted mb-1 block">Model</label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gpt-4o" required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted mb-1 block">Role / Specialty</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. complex-reasoning" />
            </div>
            {NEEDS_ENDPOINT.has(provider) && (
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted mb-1 block">Endpoint URL</label>
                <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="http://localhost:11434" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-muted mb-1 block">API Key</label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-muted mb-3">Parameters</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Temperature</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Max Tokens</label>
                <Input
                  type="number"
                  step="256"
                  min="1"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Top P (optional)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={topP ?? ''}
                  onChange={(e) => setTopP(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              {initial ? 'Update' : 'Add'} LLM
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
