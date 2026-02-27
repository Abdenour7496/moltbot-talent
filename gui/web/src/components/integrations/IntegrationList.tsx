import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plug, Settings, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  connected: boolean;
  lastSync?: string;
}

interface IntegrationListProps {
  integrations: Integration[];
  onConfigure: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function IntegrationList({ integrations, onConfigure, onAdd, onDelete }: IntegrationListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add Integration
        </Button>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plug className="h-10 w-10 text-muted mb-3" />
            <p className="text-sm text-muted">No integrations configured.</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />
              Add your first integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((intg) => (
            <Card key={intg.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{intg.name}</h3>
                    <p className="text-xs text-muted mt-0.5">{intg.type}</p>
                  </div>
                  <Badge variant={intg.connected ? 'success' : 'outline'}>
                    {intg.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{intg.description}</p>
                {intg.lastSync && (
                  <p className="text-xs text-muted">
                    Last sync: {new Date(intg.lastSync).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => onConfigure(intg.id)}>
                    <Settings className="h-3 w-3" />
                    Configure
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(intg.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
