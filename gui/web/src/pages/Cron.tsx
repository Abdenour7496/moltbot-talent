import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { CronList } from '@/components/cron/CronList';
import { CronEditor } from '@/components/cron/CronEditor';

export function CronPage() {
  const { data: tasks, loading, refetch } = useApi(() => api.getCronTasks());
  const { data: personas } = useApi(() => api.getPersonas());

  const personaIds = (personas ?? []).map((p: any) => p.id ?? p.config?.id);

  const handleCreate = async (data: { name: string; personaId: string; schedule: string; action: string }) => {
    await api.createCronTask(data);
    refetch();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await api.updateCronTask(id, { enabled });
    refetch();
  };

  const handleTrigger = async (id: string) => {
    const result = await api.triggerCronTask(id);
    alert(result.message);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await api.deleteCronTask(id);
    refetch();
  };

  if (loading) return <p className="text-muted">Loading scheduled tasks...</p>;

  return (
    <div className="space-y-4">
      <CronEditor personas={personaIds} onSubmit={handleCreate} />
      <CronList
        tasks={tasks ?? []}
        onToggle={handleToggle}
        onTrigger={handleTrigger}
        onDelete={handleDelete}
      />
    </div>
  );
}
