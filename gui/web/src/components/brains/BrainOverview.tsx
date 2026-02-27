import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Brain } from 'lucide-react';
import { api } from '@/lib/api';
import { RoutingStrategySelector } from './RoutingStrategySelector';
import { LlmCard } from './LlmCard';
import { LlmEditor } from './LlmEditor';

interface BrainOverviewProps {
  personaId: string;
  personaName: string;
  onBack: () => void;
}

export function BrainOverview({ personaId, personaName, onBack }: BrainOverviewProps) {
  const [brain, setBrain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [testResult, setTestResult] = useState<{ llmId: string; message: string; success: boolean } | null>(null);

  const fetchBrain = async () => {
    const data = await api.getBrain(personaId);
    setBrain(data);
    setLoading(false);
  };

  useEffect(() => { fetchBrain(); }, [personaId]);

  const handleStrategyUpdate = async (data: { routingStrategy?: string; fallbackLlmId?: string }) => {
    const updated = await api.updateBrain(personaId, data);
    setBrain(updated);
  };

  const handleAddLlm = async (data: any) => {
    await api.addBrainLlm(personaId, data);
    setAdding(false);
    fetchBrain();
  };

  const handleUpdateLlm = async (data: any) => {
    if (!editingId) return;
    await api.updateBrainLlm(personaId, editingId, data);
    setEditingId(null);
    fetchBrain();
  };

  const handleDeleteLlm = async (llmId: string) => {
    await api.deleteBrainLlm(personaId, llmId);
    fetchBrain();
  };

  const handleTestLlm = async (llmId: string) => {
    setTestResult(null);
    const result = await api.testBrainLlm(personaId, llmId);
    setTestResult({ llmId, message: result.message, success: result.success });
  };

  const handleToggle = async (llmId: string, enabled: boolean) => {
    await api.updateBrainLlm(personaId, llmId, { enabled });
    fetchBrain();
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0 || !brain) return;
    const ids = brain.llms.map((l: any) => l.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await api.reorderBrainLlms(personaId, ids);
    fetchBrain();
  };

  if (loading) return <p className="text-muted">Loading brain config...</p>;
  if (!brain) return <p className="text-muted">No brain config found.</p>;

  const editingLlm = editingId ? brain.llms.find((l: any) => l.id === editingId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Brain className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-xl font-semibold">Brain Configuration</h2>
            <p className="text-sm text-muted">{personaName}</p>
          </div>
        </div>
        <Badge variant="outline">{brain.llms.length} LLM{brain.llms.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Routing Strategy */}
      <RoutingStrategySelector
        routingStrategy={brain.routingStrategy}
        fallbackLlmId={brain.fallbackLlmId}
        llms={brain.llms}
        onUpdate={handleStrategyUpdate}
      />

      {/* Test result banner */}
      {testResult && (
        <div className={`text-sm px-3 py-2 rounded border ${testResult.success ? 'border-green-800 bg-green-950 text-green-400' : 'border-red-800 bg-red-950 text-red-400'}`}>
          {testResult.message}
          <button className="ml-2 underline text-xs" onClick={() => setTestResult(null)}>dismiss</button>
        </div>
      )}

      {/* LLM List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">LLM Entries</h3>
          {!adding && !editingId && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              Add LLM
            </Button>
          )}
        </div>

        {adding && (
          <LlmEditor onSave={handleAddLlm} onCancel={() => setAdding(false)} />
        )}

        {brain.llms.map((llm: any, i: number) =>
          editingId === llm.id ? (
            <LlmEditor
              key={llm.id}
              initial={editingLlm}
              onSave={handleUpdateLlm}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={llm.id} onDoubleClick={() => handleMoveUp(i)}>
              <LlmCard
                llm={llm}
                onEdit={setEditingId}
                onDelete={handleDeleteLlm}
                onTest={handleTestLlm}
                onToggle={handleToggle}
              />
            </div>
          ),
        )}

        {brain.llms.length === 0 && !adding && (
          <p className="text-sm text-muted text-center py-8">No LLMs configured. Add one to get started.</p>
        )}
      </div>
    </div>
  );
}
