import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, AlertTriangle } from 'lucide-react';
import type { AzureKnowledgeBase } from '@/types/azure-knowledge';

interface EditAzureKBFormProps {
  kb: AzureKnowledgeBase;
  onSave: (id: string, data: Partial<AzureKnowledgeBase>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function EditAzureKBForm({ kb, onSave, onDelete, onClose }: EditAzureKBFormProps) {
  const [description, setDescription] = useState(kb.description ?? '');
  const [outputMode, setOutputMode] = useState(kb.outputMode ?? 'answerSynthesis');
  const [reasoningEffort, setReasoningEffort] = useState(kb.retrievalReasoningEffort ?? 'medium');
  const [retrievalInstructions, setRetrievalInstructions] = useState(kb.retrievalInstructions ?? '');
  const [answerInstructions, setAnswerInstructions] = useState(kb.answerInstructions ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(kb.name, {
        description: description || undefined,
        outputMode,
        retrievalReasoningEffort: reasoningEffort,
        retrievalInstructions: retrievalInstructions || undefined,
        answerInstructions: answerInstructions || undefined,
        knowledgeSources: kb.knowledgeSources,
        models: kb.models,
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(kb.name);
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Edit: {kb.name}</CardTitle>
        <Badge variant="outline">{kb.outputMode ?? 'answerSynthesis'}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-muted">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted">Output Mode</label>
            <Select
              value={outputMode}
              onChange={(e) => setOutputMode(e.target.value as typeof outputMode)}
            >
              <option value="answerSynthesis">Answer Synthesis</option>
              <option value="extractiveData">Extractive Data</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Reasoning Effort</label>
            <Select
              value={reasoningEffort}
              onChange={(e) => setReasoningEffort(e.target.value as typeof reasoningEffort)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
        </div>

        {/* Connected sources (read-only display) */}
        {kb.knowledgeSources && kb.knowledgeSources.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted">Connected Sources</label>
            <div className="flex flex-wrap gap-1.5">
              {kb.knowledgeSources.map((src) => (
                <Badge key={src} variant="outline">{src}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted">Retrieval Instructions</label>
          <textarea
            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground min-h-[60px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            value={retrievalInstructions}
            onChange={(e) => setRetrievalInstructions(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted">Answer Instructions</label>
          <textarea
            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground min-h-[60px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            value={answerInstructions}
            onChange={(e) => setAnswerInstructions(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {!confirmDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400">Confirm delete?</span>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                Yes, delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
