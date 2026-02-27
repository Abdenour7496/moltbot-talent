import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { HookList } from '@/components/hooks/HookList';
import { HookEditor } from '@/components/hooks/HookEditor';

export function HooksPage() {
  const { data: hooks, loading, refetch } = useApi(() => api.getHooks());

  const handleCreate = async (data: { name: string; event: string; type: string; config: any }) => {
    await api.createHook(data);
    refetch();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await api.updateHook(id, { enabled });
    refetch();
  };

  const handleTest = async (id: string) => {
    const result = await api.testHook(id);
    alert(result.message);
  };

  const handleDelete = async (id: string) => {
    await api.deleteHook(id);
    refetch();
  };

  if (loading) return <p className="text-muted">Loading hooks...</p>;

  return (
    <div className="space-y-4">
      <HookEditor onSubmit={handleCreate} />
      <HookList
        hooks={hooks ?? []}
        onToggle={handleToggle}
        onTest={handleTest}
        onDelete={handleDelete}
      />
    </div>
  );
}
