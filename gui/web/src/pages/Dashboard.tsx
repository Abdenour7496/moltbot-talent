import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { SystemHealth } from '@/components/dashboard/SystemHealth';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ActivePersonas } from '@/components/dashboard/ActivePersonas';
import { WorkflowsWidget } from '@/components/dashboard/WorkflowsWidget';
import { PendingApprovals } from '@/components/dashboard/PendingApprovals';
import { ContractsWidget } from '@/components/dashboard/ContractsWidget';
import { Loader2 } from 'lucide-react';

export function DashboardPage() {
  const { data, loading, refetch } = useApi(() => api.getDashboard());

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Stats cards — all clickable */}
      <StatsCards stats={data.stats} />

      {/* Row 2: Quick Actions + Active Personas */}
      <div className="grid gap-6 lg:grid-cols-3">
        <QuickActions />
        <div className="lg:col-span-2">
          <ActivePersonas
            personas={data.topPersonas ?? []}
            onRefresh={refetch}
          />
        </div>
      </div>

      {/* Row 3: Workflows + Pending Approvals */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowsWidget workflows={data.workflowSummary ?? []} />
        <PendingApprovals
          approvals={data.pendingApprovals ?? []}
          onRefresh={refetch}
        />
      </div>

      {/* Row 4: Recent Activity + System Health + Contracts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RecentActivity activity={data.recentActivity} />
        </div>
        <SystemHealth
          health={data.health}
          onRefresh={refetch}
          refreshing={loading}
        />
        <ContractsWidget contracts={data.contractsSummary ?? []} />
      </div>
    </div>
  );
}
