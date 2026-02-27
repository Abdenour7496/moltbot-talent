import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { HealthOverview } from '@/components/health/HealthOverview';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function HealthPage() {
  const { data, loading, refetch } = useApi(() => api.getHealth());

  if (loading || !data) return <p className="text-muted">Loading health data...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Health</h2>
        <Button size="sm" variant="outline" onClick={refetch}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      <HealthOverview data={data} />
    </div>
  );
}
