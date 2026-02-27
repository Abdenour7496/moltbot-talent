import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeTime, outcomeColor } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronRight, Eye } from 'lucide-react';

interface ActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  persona: string;
  outcome: string;
  target?: string;
}

interface RecentActivityProps {
  activity: ActivityEntry[];
}

/** Map action keywords to the most likely page the user would want to visit. */
function actionRoute(entry: ActivityEntry): string | null {
  const a = entry.action.toLowerCase();
  if (a.includes('persona') && entry.target) return `/personas`;
  if (a.includes('approval')) return '/approvals';
  if (a.includes('knowledge')) return '/knowledge';
  if (a.includes('session')) return '/sessions';
  if (a.includes('workflow')) return '/workflows';
  if (a.includes('contract')) return '/contracts';
  if (a.includes('security') || a.includes('auth')) return '/security';
  if (a.includes('integration')) return '/integrations';
  if (a.includes('channel')) return '/channels';
  if (a.includes('hook')) return '/hooks';
  if (a.includes('skill')) return '/skills';
  if (a.includes('cron') || a.includes('schedule')) return '/cron';
  return null;
}

export function RecentActivity({ activity }: RecentActivityProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/audit')}
          className="text-xs gap-1"
        >
          View All <ExternalLink className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {activity.map((entry) => {
              const route = actionRoute(entry);
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-4 rounded-md px-3 py-2 transition-colors ${
                    route
                      ? 'hover:bg-hover cursor-pointer group'
                      : ''
                  }`}
                  onClick={route ? () => navigate(route) : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${outcomeColor(entry.outcome).replace('text-', 'bg-')}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {entry.persona}
                        {entry.target ? ` — ${entry.target}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        entry.outcome === 'success'
                          ? 'success'
                          : entry.outcome === 'failure'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {entry.outcome}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                    {route && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
