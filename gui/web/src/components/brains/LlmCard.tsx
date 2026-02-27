import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, FlaskConical, GripVertical } from 'lucide-react';

interface LlmCardProps {
  llm: {
    id: string;
    label: string;
    provider: string;
    model: string;
    role: string;
    priority: number;
    enabled: boolean;
    endpoint?: string;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-900/40 text-green-400',
  anthropic: 'bg-orange-900/40 text-orange-400',
  google: 'bg-blue-900/40 text-blue-400',
  ollama: 'bg-purple-900/40 text-purple-400',
  azure: 'bg-cyan-900/40 text-cyan-400',
  custom: 'bg-muted/20 text-muted',
};

export function LlmCard({ llm, onEdit, onDelete, onTest, onToggle }: LlmCardProps) {
  return (
    <Card className={!llm.enabled ? 'opacity-50' : ''}>
      <CardContent className="flex items-center gap-4 py-3">
        <GripVertical className="h-4 w-4 text-muted cursor-grab shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{llm.label}</span>
            <Badge variant="outline" className="text-xs">#{llm.priority}</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded ${PROVIDER_COLORS[llm.provider] ?? PROVIDER_COLORS.custom}`}>
              {llm.provider}
            </span>
            <span className="text-xs text-muted">{llm.model}</span>
            {llm.endpoint && <span className="text-xs text-muted truncate max-w-[150px]">{llm.endpoint}</span>}
            <Badge variant="outline" className="text-xs">{llm.role}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <label className="relative inline-flex items-center cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={llm.enabled}
              onChange={() => onToggle(llm.id, !llm.enabled)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-border peer-checked:bg-accent rounded-full peer-focus:ring-2 peer-focus:ring-accent transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
          </label>
          <Button variant="ghost" size="sm" onClick={() => onTest(llm.id)} title="Test connectivity">
            <FlaskConical className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(llm.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(llm.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
