import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Plug, Unplug, Trash2 } from 'lucide-react';

interface IntegrationConfigProps {
  integration: {
    id: string;
    name: string;
    type: string;
    description: string;
    connected: boolean;
    config: Record<string, string>;
  };
  onBack: () => void;
  onSave: (id: string, data: { config: Record<string, string>; connected: boolean }) => void;
  onDelete?: (id: string) => void;
}

export function IntegrationConfig({ integration, onBack, onSave, onDelete }: IntegrationConfigProps) {
  const [config, setConfig] = useState({ ...integration.config });
  const [connected, setConnected] = useState(integration.connected);

  const handleSave = () => {
    onSave(integration.id, { config, connected });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">{integration.name}</h2>
        <Badge variant={connected ? 'success' : 'outline'}>
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(config).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-muted capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <Input
                type={key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') || key.toLowerCase().includes('apikey') ? 'password' : 'text'}
                value={value}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                placeholder={`Enter ${key}...`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Configuration
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setConnected(!connected);
            onSave(integration.id, { config, connected: !connected });
          }}
        >
          {connected ? <Unplug className="h-4 w-4" /> : <Plug className="h-4 w-4" />}
          {connected ? 'Disconnect' : 'Connect'}
        </Button>
        {onDelete && (
          <Button variant="destructive" onClick={() => onDelete(integration.id)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
