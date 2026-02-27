import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Zap } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface Persona {
  id: string;
  name: string;
  path: string;
  active: boolean;
  loadedAt: string;
  integrations: string[];
}

interface PersonaListProps {
  personas: Persona[];
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
}

export function PersonaList({ personas, onSelect, onActivate }: PersonaListProps) {
  if (personas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm text-muted">No personas loaded yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Load a persona from a directory to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {personas.map((p) => (
        <Card key={p.id} className="cursor-pointer hover:border-accent/50 transition-colors" onClick={() => onSelect(p.id)}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted mt-0.5">{p.id}</p>
              </div>
              <Badge variant={p.active ? 'success' : 'outline'}>
                {p.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{p.path}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Loaded {formatRelativeTime(p.loadedAt)}</span>
              {!p.active && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onActivate(p.id);
                  }}
                >
                  <Zap className="h-3 w-3" />
                  Activate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
