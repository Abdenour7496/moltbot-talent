import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ComponentHealth {
  name: string;
  status: string;
  details: string;
  latency?: number;
}

interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
  responseTime: number;
  components: ComponentHealth[];
}

interface HealthOverviewProps {
  data: HealthData;
}

const statusVariant = (s: string) =>
  s === 'healthy' ? 'success' : s === 'degraded' ? 'warning' : 'destructive';

const statusDot = (s: string) =>
  s === 'healthy'
    ? 'bg-emerald-400'
    : s === 'degraded'
      ? 'bg-amber-400'
      : 'bg-red-400';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function HealthOverview({ data }: HealthOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={cn('h-3 w-3 rounded-full', statusDot(data.status))} />
          <span className="text-lg font-semibold capitalize">{data.status}</span>
        </div>
        <Badge variant="outline">Uptime: {formatUptime(data.uptime)}</Badge>
        <Badge variant="outline">Response: {data.responseTime}ms</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.components.map((c) => (
          <Card key={c.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{c.name}</CardTitle>
                <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted">{c.details}</p>
              {c.latency !== undefined && (
                <p className="text-xs text-muted mt-1">Latency: {c.latency}ms</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
