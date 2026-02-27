import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  Users,
  MessageSquare,
  Radio,
  Plug,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SystemHealthProps {
  health: {
    api: string;
    vectorDb: string;
    uptime: number;
    personas?: number;
    sessions?: number;
    channels?: number;
    integrations?: number;
  };
  onRefresh?: () => void;
  refreshing?: boolean;
}

function statusColor(status: string) {
  if (status === 'healthy' || status === 'connected') return 'text-emerald-400';
  if (status === 'idle') return 'text-amber-400';
  return 'text-red-400';
}

function statusDot(status: string) {
  if (status === 'healthy' || status === 'connected') return 'bg-emerald-400';
  if (status === 'idle') return 'bg-amber-400';
  return 'bg-red-400';
}

export function SystemHealth({ health, onRefresh, refreshing }: SystemHealthProps) {
  const navigate = useNavigate();
  const uptimeMinutes = Math.floor(health.uptime / 60);
  const hours = Math.floor(uptimeMinutes / 60);
  const mins = uptimeMinutes % 60;
  const uptimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const rows = [
    {
      icon: Server,
      label: 'API Server',
      value: health.api,
      color: statusColor(health.api),
      dot: statusDot(health.api),
      to: '/health',
    },
    {
      icon: Database,
      label: 'Vector DB',
      value: health.vectorDb,
      color: statusColor(health.vectorDb),
      dot: statusDot(health.vectorDb),
      to: '/knowledge',
    },
    {
      icon: Activity,
      label: 'Uptime',
      value: uptimeStr,
      color: 'text-foreground',
      dot: 'bg-emerald-400',
      to: '/health',
    },
  ];

  const subsystems = [
    { icon: Users, label: 'Personas', value: health.personas ?? 0, to: '/personas' },
    { icon: MessageSquare, label: 'Sessions', value: health.sessions ?? 0, to: '/sessions' },
    { icon: Radio, label: 'Channels', value: health.channels ?? 0, to: '/channels' },
    { icon: Plug, label: 'Integrations', value: health.integrations ?? 0, to: '/integrations' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>System Health</CardTitle>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Core services */}
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-hover cursor-pointer transition-colors group"
            onClick={() => navigate(r.to)}
          >
            <div className="flex items-center gap-2">
              <span className={cn('h-1.5 w-1.5 rounded-full', r.dot)} />
              <r.icon className="h-4 w-4 text-muted" />
              <span className="text-sm">{r.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn('text-sm font-medium', r.color)}>{r.value}</span>
              <ChevronRight className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}

        {/* Subsystem counts */}
        <div className="border-t border-border pt-3 mt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted mb-2">
            Subsystems
          </p>
          <div className="grid grid-cols-2 gap-2">
            {subsystems.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover cursor-pointer transition-colors"
                onClick={() => navigate(s.to)}
              >
                <s.icon className="h-3.5 w-3.5 text-muted" />
                <span className="text-xs">{s.label}</span>
                <span className="text-xs font-medium ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
