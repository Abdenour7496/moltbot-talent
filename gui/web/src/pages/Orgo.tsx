import { useState, useCallback } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { OrgoOverview } from '@/components/orgo/OrgoOverview';
import { ComputerDetail } from '@/components/orgo/ComputerDetail';
import { CreateComputerForm } from '@/components/orgo/CreateComputerForm';
import { CreateWorkspaceForm } from '@/components/orgo/CreateWorkspaceForm';

type View = 'overview' | 'computer' | 'add-computer' | 'add-workspace';

export function OrgoPage() {
  const [view, setView] = useState<View>('overview');
  const [selectedComputerId, setSelectedComputerId] = useState<string | null>(null);

  const { data: workspaces, loading: wsLoading, refetch: refetchWs } = useApi(() => api.getOrgoWorkspaces());
  const { data: computers, loading: compLoading, refetch: refetchComp } = useApi(() => api.getOrgoComputers());
  const { data: templates, loading: tplLoading, refetch: refetchTpl } = useApi(() => api.getOrgoTemplates());
  const { data: actions, refetch: refetchActions } = useApi(
    () => (selectedComputerId ? api.getOrgoActions(selectedComputerId) : Promise.resolve([])),
    [selectedComputerId],
  );

  const refetchAll = useCallback(() => {
    refetchWs();
    refetchComp();
    refetchTpl();
  }, [refetchWs, refetchComp, refetchTpl]);

  const loading = wsLoading || compLoading || tplLoading;
  if (loading) return <p className="text-muted">Loading Orgo infrastructure...</p>;

  /* ── Computer Detail ────────────────────────────────────────── */
  if (view === 'computer' && selectedComputerId) {
    const computer = (computers ?? []).find((c: any) => c.id === selectedComputerId);
    if (!computer) {
      return <p className="text-muted">Computer not found.</p>;
    }

    return (
      <ComputerDetail
        computer={computer}
        actions={actions ?? []}
        onBack={() => {
          setView('overview');
          setSelectedComputerId(null);
          refetchAll();
        }}
        onStart={async () => {
          await api.startOrgoComputer(selectedComputerId);
          refetchComp();
        }}
        onStop={async () => {
          await api.stopOrgoComputer(selectedComputerId);
          refetchComp();
        }}
        onRestart={async () => {
          await api.restartOrgoComputer(selectedComputerId);
          refetchComp();
        }}
        onScreenshot={() => api.orgoScreenshot(selectedComputerId)}
        onClick={(data) => api.orgoClick(selectedComputerId, data)}
        onType={(data) => api.orgoType(selectedComputerId, data)}
        onKey={(data) => api.orgoKey(selectedComputerId, data)}
        onBash={(data) => api.orgoBash(selectedComputerId, data)}
        onExec={(data) => api.orgoExec(selectedComputerId, data)}
        onScroll={(data) => api.orgoScroll(selectedComputerId, data)}
        onDrag={(data) => api.orgoDrag(selectedComputerId, data)}
        onWait={(data) => api.orgoWait(selectedComputerId, data)}
        onPrompt={(data) => api.orgoPrompt(selectedComputerId, data)}
        onRefreshActions={() => refetchActions()}
      />
    );
  }

  /* ── Create Computer ────────────────────────────────────────── */
  if (view === 'add-computer') {
    return (
      <CreateComputerForm
        workspaces={(workspaces ?? []).map((ws: any) => ({ id: ws.id, name: ws.name }))}
        templates={(templates ?? []).map((t: any) => ({ id: t.id, name: t.name }))}
        onBack={() => setView('overview')}
        onSubmit={async (data) => {
          await api.createOrgoComputer(data);
          refetchAll();
          setView('overview');
        }}
      />
    );
  }

  /* ── Create Workspace ───────────────────────────────────────── */
  if (view === 'add-workspace') {
    return (
      <CreateWorkspaceForm
        onBack={() => setView('overview')}
        onSubmit={async (data) => {
          await api.createOrgoWorkspace(data);
          refetchAll();
          setView('overview');
        }}
      />
    );
  }

  /* ── Overview ───────────────────────────────────────────────── */
  return (
    <OrgoOverview
      workspaces={workspaces ?? []}
      computers={computers ?? []}
      templates={templates ?? []}
      onSelectComputer={(id) => {
        setSelectedComputerId(id);
        setView('computer');
      }}
      onAddWorkspace={() => setView('add-workspace')}
      onAddComputer={() => setView('add-computer')}
      onDeleteWorkspace={async (id) => {
        await api.deleteOrgoWorkspace(id);
        refetchAll();
      }}
      onDeleteComputer={async (id) => {
        await api.deleteOrgoComputer(id);
        refetchAll();
      }}
      onStartComputer={async (id) => {
        await api.startOrgoComputer(id);
        refetchComp();
      }}
      onStopComputer={async (id) => {
        await api.stopOrgoComputer(id);
        refetchComp();
      }}
      onRestartComputer={async (id) => {
        await api.restartOrgoComputer(id);
        refetchComp();
      }}
      onDeleteTemplate={async (id) => {
        await api.deleteOrgoTemplate(id);
        refetchTpl();
      }}
      onBuildTemplate={async (id) => {
        await api.buildOrgoTemplate(id);
        refetchTpl();
      }}
    />
  );
}
