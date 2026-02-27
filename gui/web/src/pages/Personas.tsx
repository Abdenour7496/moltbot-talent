import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { PersonaList } from '@/components/personas/PersonaList';
import { PersonaDetail } from '@/components/personas/PersonaDetail';
import { PersonaEditor } from '@/components/personas/PersonaEditor';
import { BrainOverview } from '@/components/brains/BrainOverview';

export function PersonasPage() {
  const { data: personas, loading, refetch } = useApi(() => api.getPersonas());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [brainPersonaId, setBrainPersonaId] = useState<string | null>(null);

  const handleSelect = async (id: string) => {
    const data = await api.getPersona(id);
    setDetail(data);
    setSelectedId(id);
  };

  const handleActivate = async (id: string) => {
    await api.activatePersona(id);
    refetch();
    if (detail?.id === id) {
      setDetail({ ...detail, active: true });
    }
  };

  const handleLoad = async (data: { id: string; name: string; path: string }) => {
    await api.loadPersona(data);
    refetch();
  };

  const handleCreate = async (data: {
    id: string;
    name: string;
    soul: string;
    expertise: string;
    procedures: string;
    tools: string;
    knowledgeBaseId?: string;
  }) => {
    await api.createPersona(data);
    // If a knowledge base was chosen in the wizard, link it now
    if (data.knowledgeBaseId) {
      await api.assignKnowledgeBase(data.id, data.knowledgeBaseId).catch(() => {});
    }
    refetch();
  };

  if (loading) return <p className="text-muted">Loading personas...</p>;

  if (brainPersonaId && detail) {
    return (
      <BrainOverview
        personaId={brainPersonaId}
        personaName={detail.name}
        onBack={() => setBrainPersonaId(null)}
      />
    );
  }

  if (selectedId && detail) {
    return (
      <PersonaDetail
        persona={detail}
        onBack={() => { setSelectedId(null); setDetail(null); }}
        onActivate={handleActivate}
        onConfigureBrain={(id) => setBrainPersonaId(id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PersonaEditor onLoad={handleLoad} onCreate={handleCreate} />
      <PersonaList
        personas={personas ?? []}
        onSelect={handleSelect}
        onActivate={handleActivate}
      />
    </div>
  );
}
