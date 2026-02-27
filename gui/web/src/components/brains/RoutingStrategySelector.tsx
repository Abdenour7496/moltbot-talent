import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

interface RoutingStrategySelectorProps {
  routingStrategy: string;
  fallbackLlmId?: string;
  llms: { id: string; label: string }[];
  onUpdate: (data: { routingStrategy?: string; fallbackLlmId?: string }) => void;
}

const STRATEGIES = [
  { value: 'priority', label: 'Priority — use highest-priority enabled LLM' },
  { value: 'task-match', label: 'Task Match — pick LLM by role/specialty' },
  { value: 'round-robin', label: 'Round Robin — rotate across enabled LLMs' },
  { value: 'cost-optimized', label: 'Cost Optimized — prefer cheapest capable LLM' },
];

export function RoutingStrategySelector({
  routingStrategy,
  fallbackLlmId,
  llms,
  onUpdate,
}: RoutingStrategySelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Routing Strategy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted mb-1 block">Strategy</label>
          <Select
            value={routingStrategy}
            onChange={(e) => onUpdate({ routingStrategy: e.target.value })}
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted mb-1 block">Fallback LLM</label>
          <Select
            value={fallbackLlmId ?? ''}
            onChange={(e) => onUpdate({ fallbackLlmId: e.target.value || undefined })}
          >
            <option value="">None</option>
            {llms.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
