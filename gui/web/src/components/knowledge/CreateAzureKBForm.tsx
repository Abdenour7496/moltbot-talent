import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Globe, Database, HardDrive, FileText } from 'lucide-react';
import type { CreateKBPayload, KnowledgeSourceKind } from '@/types/azure-knowledge';

interface CreateAzureKBFormProps {
  knowledgeSources: Array<{ name: string; kind: KnowledgeSourceKind }>;
  onSubmit: (data: CreateKBPayload) => Promise<void>;
  onCancel: () => void;
}

const SOURCE_KIND_ICONS: Record<string, React.ReactNode> = {
  searchIndex: <Database className="h-3 w-3" />,
  azureBlob: <HardDrive className="h-3 w-3" />,
  web: <Globe className="h-3 w-3" />,
  remoteSharePoint: <FileText className="h-3 w-3" />,
  indexedSharePoint: <FileText className="h-3 w-3" />,
  indexedOneLake: <Database className="h-3 w-3" />,
};

export function CreateAzureKBForm({ knowledgeSources, onSubmit, onCancel }: CreateAzureKBFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [outputMode, setOutputMode] = useState<'answerSynthesis' | 'extractiveData'>('answerSynthesis');
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [retrievalInstructions, setRetrievalInstructions] = useState('');
  const [answerInstructions, setAnswerInstructions] = useState('');
  const [modelDeployment, setModelDeployment] = useState('');
  const [modelResourceUri, setModelResourceUri] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const nameValid = /^[a-zA-Z0-9_-]{1,64}$/.test(name);

  const toggleSource = (sourceName: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceName)
        ? prev.filter((s) => s !== sourceName)
        : [...prev, sourceName],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nameValid || selectedSources.length === 0) return;

    setSubmitting(true);
    setError('');
    try {
      const payload: CreateKBPayload = {
        name,
        description: description || undefined,
        outputMode,
        retrievalReasoningEffort: reasoningEffort,
        knowledgeSources: selectedSources,
        retrievalInstructions: retrievalInstructions || undefined,
        answerInstructions: answerInstructions || undefined,
      };

      // Add model if provided
      if (modelDeployment && modelResourceUri) {
        payload.models = [
          {
            modelId: `azureOpenAI/${modelDeployment}`,
            azureOpenAIParameters: {
              resourceUri: modelResourceUri,
              deploymentId: modelDeployment,
              apiKey: '{{AZURE_OPENAI_API_KEY}}',
            },
          },
        ];
      }

      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create knowledge base');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create Azure Knowledge Base</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted">Name *</label>
              <Input
                placeholder="my-knowledge-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={name && !nameValid ? 'border-red-400' : ''}
              />
              {name && !nameValid && (
                <p className="text-xs text-red-400">
                  1-64 chars, alphanumeric, hyphens and underscores only
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Description</label>
              <Input
                placeholder="Optional description (max 500 chars)"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              />
            </div>
          </div>

          {/* Output mode + reasoning */}
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

          {/* Model deployment (optional) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted">Model Deployment ID</label>
              <Input
                placeholder="e.g. gpt-4o"
                value={modelDeployment}
                onChange={(e) => setModelDeployment(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Azure OpenAI Resource URI</label>
              <Input
                placeholder="https://my-openai.openai.azure.com"
                value={modelResourceUri}
                onChange={(e) => setModelResourceUri(e.target.value)}
              />
            </div>
          </div>

          {/* Knowledge sources selection */}
          <div className="space-y-2">
            <label className="text-xs text-muted">
              Knowledge Sources * ({selectedSources.length} selected)
            </label>
            {knowledgeSources.length === 0 ? (
              <p className="text-xs text-muted italic">
                No knowledge sources available. Create one first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {knowledgeSources.map((src) => {
                  const selected = selectedSources.includes(src.name);
                  return (
                    <button
                      key={src.name}
                      type="button"
                      onClick={() => toggleSource(src.name)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        selected
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border bg-input/50 text-muted hover:border-accent/50'
                      }`}
                    >
                      {SOURCE_KIND_ICONS[src.kind] ?? <Database className="h-3 w-3" />}
                      {src.name}
                      {selected && <X className="h-3 w-3 ml-1" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <label className="text-xs text-muted">Retrieval Instructions</label>
            <textarea
              className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground min-h-[60px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Optional: guide retrieval behaviour..."
              value={retrievalInstructions}
              onChange={(e) => setRetrievalInstructions(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Answer Instructions</label>
            <textarea
              className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground min-h-[60px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Optional: guide answer synthesis..."
              value={answerInstructions}
              onChange={(e) => setAnswerInstructions(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name || !nameValid || selectedSources.length === 0 || submitting}
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Creating...' : 'Create Knowledge Base'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
