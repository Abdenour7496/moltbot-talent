import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { SessionList } from '@/components/sessions/SessionList';
import { SessionDetail } from '@/components/sessions/SessionDetail';
import { SessionCreate } from '@/components/sessions/SessionCreate';
import { Button } from '@/components/ui/button';

export function SessionsPage() {
  const { data: sessions, loading, refetch } = useApi(() => api.getSessions());
  const { data: personas } = useApi(() => api.getPersonas());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [filter, setFilter] = useState<string>('');

  const handleSelect = async (id: string) => {
    const data = await api.getSession(id);
    setDetail(data);
    setSelectedId(id);
  };

  const handleCreate = async (data: { label: string; personaId: string }) => {
    await api.createSession(data);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await api.deleteSession(id);
    refetch();
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedId) return;
    await api.sendSessionMessage(selectedId, { role: 'user', content });
    const updated = await api.getSession(selectedId);
    setDetail(updated);
  };

  if (loading) return <p className="text-muted">Loading sessions...</p>;

  if (selectedId && detail) {
    return (
      <SessionDetail
        session={detail}
        onBack={() => { setSelectedId(null); setDetail(null); }}
        onSendMessage={handleSendMessage}
      />
    );
  }

  const personaIds = (personas ?? []).map((p: any) => p.id ?? p.config?.id);
  const filtered = filter
    ? (sessions ?? []).filter((s: any) => s.status === filter)
    : (sessions ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'active', 'idle', 'closed'].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f || 'All'}
            </Button>
          ))}
        </div>
        <SessionCreate personas={personaIds} onSubmit={handleCreate} />
      </div>
      <SessionList
        sessions={filtered}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />
    </div>
  );
}
