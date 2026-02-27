import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { IntegrationList } from '@/components/integrations/IntegrationList';
import { IntegrationConfig } from '@/components/integrations/IntegrationConfig';
import { AddIntegrationForm } from '@/components/integrations/AddIntegrationForm';

type View = 'list' | 'add' | 'configure';

export function IntegrationsPage() {
  const { data: integrations, loading, refetch } = useApi(() => api.getIntegrations());
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSave = async (id: string, data: { config: Record<string, string>; connected: boolean }) => {
    await api.updateIntegration(id, data);
    refetch();
  };

  const handleCreate = async (data: { name: string; type: string; description: string; config: Record<string, string> }) => {
    await api.createIntegration(data);
    refetch();
    setView('list');
  };

  const handleDelete = async (id: string) => {
    await api.deleteIntegration(id);
    refetch();
    setView('list');
    setSelectedId(null);
  };

  if (loading) return <p className="text-muted">Loading integrations...</p>;

  if (view === 'add') {
    return <AddIntegrationForm onBack={() => setView('list')} onSubmit={handleCreate} />;
  }

  const selected = (integrations ?? []).find((i: any) => i.id === selectedId);

  if (view === 'configure' && selected) {
    return (
      <IntegrationConfig
        integration={selected}
        onBack={() => { setView('list'); setSelectedId(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <IntegrationList
      integrations={integrations ?? []}
      onConfigure={(id) => { setSelectedId(id); setView('configure'); }}
      onAdd={() => setView('add')}
      onDelete={handleDelete}
    />
  );
}
