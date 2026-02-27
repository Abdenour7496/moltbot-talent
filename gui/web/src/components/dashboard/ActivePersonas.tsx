import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MessageCircle,
  Pencil,
  Power,
  PowerOff,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useState, useCallback } from 'react';

interface Persona {
  id: string;
  name: string;
  active: boolean;
  skills: string[];
  loadedAt: string | null;
}

interface ActivePersonasProps {
  personas: Persona[];
  onRefresh?: () => void;
}

export function ActivePersonas({ personas, onRefresh }: ActivePersonasProps) {
  const navigate = useNavigate();
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggleActivate = useCallback(
    async (p: Persona) => {
      setToggling(p.id);
      try {
        await api.activatePersona(p.id);
        onRefresh?.();
      } catch {
        /* swallow */
      } finally {
        setToggling(null);
      }
    },
    [onRefresh],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Personas
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/personas')}
          className="text-xs gap-1"
        >
          View All <ExternalLink className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {personas.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">
            No personas loaded yet.{' '}
            <button
              onClick={() => navigate('/personas')}
              className="text-accent underline"
            >
              Discover personas
            </button>
          </p>
        ) : (
          <div className="space-y-2">
            {personas.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-border p-2.5 hover:bg-hover transition-colors group"
              >
                {/* Status dot */}
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    p.active ? 'bg-emerald-400' : 'bg-muted'
                  }`}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {p.skills.slice(0, 3).map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-[9px] py-0 px-1"
                      >
                        {s}
                      </Badge>
                    ))}
                    {p.skills.length > 3 && (
                      <span className="text-[9px] text-muted">
                        +{p.skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/agent-chat');
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/personas/${p.id}/edit`);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title={p.active ? 'Deactivate' : 'Activate'}
                    disabled={toggling === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActivate(p);
                    }}
                  >
                    {p.active ? (
                      <PowerOff className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <Power className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
