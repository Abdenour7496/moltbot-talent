import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { ChannelList } from '@/components/channels/ChannelList';
import { ChannelEditor } from '@/components/channels/ChannelEditor';

export function ChannelsPage() {
  const { data: channels, loading, refetch } = useApi(() => api.getChannels());
  const { data: personas } = useApi(() => api.getPersonas());

  const personaIds = (personas ?? []).map((p: any) => p.id ?? p.config?.id);

  const handleCreate = async (data: { name: string; type: string; personaId: string; config: Record<string, string> }) => {
    await api.createChannel(data);
    refetch();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await api.updateChannel(id, { active });
    refetch();
  };

  const handleTest = async (id: string) => {
    const result = await api.testChannel(id);
    alert(result.message);
  };

  const handleDelete = async (id: string) => {
    await api.deleteChannel(id);
    refetch();
  };

  if (loading) return <p className="text-muted">Loading channels...</p>;

  return (
    <div className="space-y-4">
      <ChannelEditor personas={personaIds} onSubmit={handleCreate} />
      <ChannelList
        channels={channels ?? []}
        onToggle={handleToggle}
        onTest={handleTest}
        onDelete={handleDelete}
      />
    </div>
  );
}
