import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const INTEGRATION_TYPES = [
  'itsm',
  'alerting',
  'project',
  'communication',
  'monitoring',
  'ci-cd',
  'cloud',
  'custom',
] as const;

interface AddIntegrationFormProps {
  onBack: () => void;
  onSubmit: (data: {
    name: string;
    type: string;
    description: string;
    config: Record<string, string>;
  }) => void;
}

export function AddIntegrationForm({ onBack, onSubmit }: AddIntegrationFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(INTEGRATION_TYPES[0]);
  const [description, setDescription] = useState('');
  const [configFields, setConfigFields] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);

  const addField = () => setConfigFields([...configFields, { key: '', value: '' }]);

  const removeField = (idx: number) =>
    setConfigFields(configFields.filter((_, i) => i !== idx));

  const updateField = (idx: number, prop: 'key' | 'value', val: string) => {
    const next = [...configFields];
    next[idx] = { ...next[idx], [prop]: val };
    setConfigFields(next);
  };

  const handleSubmit = () => {
    if (!name.trim() || !type) return;
    const config: Record<string, string> = {};
    for (const f of configFields) {
      if (f.key.trim()) config[f.key.trim()] = f.value;
    }
    onSubmit({ name: name.trim(), type, description: description.trim(), config });
  };

  const isValid = name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">Add Custom Integration</h2>
      </div>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Custom Service"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted">Type *</label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {INTEGRATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this integration does"
            />
          </div>
        </CardContent>
      </Card>

      {/* Config fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted">
            Define key/value pairs for this integration (e.g. apiKey, baseUrl, token).
          </p>
          {configFields.map((field, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                className="flex-1"
                value={field.key}
                onChange={(e) => updateField(idx, 'key', e.target.value)}
                placeholder="Key (e.g. apiKey)"
              />
              <Input
                className="flex-1"
                value={field.value}
                onChange={(e) => updateField(idx, 'value', e.target.value)}
                placeholder="Default value (optional)"
                type={
                  field.key.toLowerCase().includes('password') ||
                  field.key.toLowerCase().includes('secret') ||
                  field.key.toLowerCase().includes('token') ||
                  field.key.toLowerCase().includes('apikey')
                    ? 'password'
                    : 'text'
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeField(idx)}
                disabled={configFields.length === 1}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="h-3.5 w-3.5" />
            Add Field
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={!isValid}>
          <Plus className="h-4 w-4" />
          Create Integration
        </Button>
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
