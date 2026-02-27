import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Brain,
  BookOpen,
  ClipboardList,
  Wrench,
  Database,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface KnowledgeBaseInfo {
  id: string;
  name: string;
  domain: string;
  documentCount: number;
  chunkCount: number;
  provider: string;
  embeddingModel: string;
}

interface PersonaEditorProps {
  onLoad: (data: { id: string; name: string; path: string }) => void;
  onCreate: (data: {
    id: string;
    name: string;
    soul: string;
    expertise: string;
    procedures: string;
    tools: string;
    knowledgeBaseId?: string;
  }) => void;
}

type EditorMode = 'closed' | 'load' | 'create';

const STEPS = [
  { key: 'basics', label: 'Basics', icon: Plus },
  { key: 'soul', label: 'Soul', icon: Brain },
  { key: 'expertise', label: 'Expertise', icon: BookOpen },
  { key: 'procedures', label: 'Procedures', icon: ClipboardList },
  { key: 'tools', label: 'Tools', icon: Wrench },
  { key: 'knowledge', label: 'Knowledge', icon: Database },
] as const;

const PLACEHOLDERS = {
  soul: `# Persona Name — Soul

## Core Identity
Describe who this persona is and their primary role...

## Personality Traits
- Trait 1: Description
- Trait 2: Description

## Communication Style
How this persona communicates in different contexts...

## Values
What this persona prioritizes and cares about...`,

  expertise: `# Domain Expertise

## Primary Areas
- Area 1: Key skills and knowledge
- Area 2: Key skills and knowledge

## Capabilities
What this persona can do within its domain...

## Boundaries
What this persona should NOT attempt or should escalate...

## When to Escalate
Scenarios that require human intervention...`,

  procedures: `# Standard Operating Procedures

## Procedure 1: Name
### Steps
1. Step one
2. Step two

## Communication Templates
Templates for common communications...

## Escalation Matrix
Who to contact for different scenarios...`,

  tools: `# Authorized Tools & Integrations

## Core Tools
- Tool 1: Description and usage
- Tool 2: Description and usage

## Enterprise Integrations
List integrations this persona can use...

## Approval Workflow
Which actions need approval and at what level...`,
};

export function PersonaEditor({ onLoad, onCreate }: PersonaEditorProps) {
  const [mode, setMode] = useState<EditorMode>('closed');
  const [step, setStep] = useState(0);

  // Load mode fields
  const [loadId, setLoadId] = useState('');
  const [loadName, setLoadName] = useState('');
  const [loadPath, setLoadPath] = useState('');

  // Create mode fields
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [soul, setSoul] = useState('');
  const [expertise, setExpertise] = useState('');
  const [procedures, setProcedures] = useState('');
  const [tools, setTools] = useState('');

  // Knowledge step state
  const [kbMode, setKbMode] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedKbId, setSelectedKbId] = useState('');
  const [existingKbs, setExistingKbs] = useState<KnowledgeBaseInfo[]>([]);
  const [kbsLoading, setKbsLoading] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDomain, setNewKbDomain] = useState('');
  const [creatingKb, setCreatingKb] = useState(false);
  const [createdKb, setCreatedKb] = useState<KnowledgeBaseInfo | null>(null);

  // Fetch existing knowledge bases when the Knowledge step is active
  useEffect(() => {
    if (step === 5 && mode === 'create') {
      setKbsLoading(true);
      api
        .getKnowledgeBases()
        .then((kbs) => setExistingKbs(kbs))
        .catch(() => {})
        .finally(() => setKbsLoading(false));
    }
  }, [step, mode]);

  const resetCreate = () => {
    setStep(0);
    setId('');
    setName('');
    setSoul('');
    setExpertise('');
    setProcedures('');
    setTools('');
    setKbMode('none');
    setSelectedKbId('');
    setNewKbName('');
    setNewKbDomain('');
    setCreatedKb(null);
  };

  const resetLoad = () => {
    setLoadId('');
    setLoadName('');
    setLoadPath('');
  };

  const handleClose = () => {
    setMode('closed');
    resetCreate();
    resetLoad();
  };

  const handleLoadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadId || !loadName || !loadPath) return;
    onLoad({ id: loadId, name: loadName, path: loadPath });
    resetLoad();
    setMode('closed');
  };

  const handleCreateNewKb = async () => {
    if (!newKbName || !newKbDomain) return;
    setCreatingKb(true);
    try {
      const kb = await api.createKnowledgeBase({ name: newKbName, domain: newKbDomain });
      setCreatedKb(kb);
      setSelectedKbId(kb.id);
      setKbMode('existing'); // show the newly created KB as "selected existing"
      setExistingKbs((prev) => [...prev, kb]);
    } catch {
      // silently ignore — user can retry
    } finally {
      setCreatingKb(false);
    }
  };

  const resolvedKbId = (): string | undefined => {
    if (kbMode === 'none') return undefined;
    return selectedKbId || undefined;
  };

  const handleCreateSubmit = () => {
    if (!id || !name) return;
    onCreate({ id, name, soul, expertise, procedures, tools, knowledgeBaseId: resolvedKbId() });
    resetCreate();
    setMode('closed');
  };

  const autoGenerateId = (val: string) => {
    setName(val);
    if (!id || id === nameToId(name)) {
      setId(nameToId(val));
    }
  };

  // Closed state — show action buttons
  if (mode === 'closed') {
    return (
      <div className="flex gap-3">
        <Button onClick={() => setMode('create')}>
          <Plus className="h-4 w-4" />
          Create New Persona
        </Button>
        <Button variant="outline" onClick={() => setMode('load')}>
          Load from Directory
        </Button>
      </div>
    );
  }

  // Load mode — simple form
  if (mode === 'load') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Load Persona from Directory</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoadSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted">ID</label>
              <Input placeholder="e.g. it-ops-specialist" value={loadId} onChange={(e) => setLoadId(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted">Name</label>
              <Input placeholder="e.g. IT Operations Specialist" value={loadName} onChange={(e) => setLoadName(e.target.value)} />
            </div>
            <div className="flex-[2] space-y-1">
              <label className="text-xs text-muted">Directory Path</label>
              <Input placeholder="e.g. ./personas/it-ops-specialist" value={loadPath} onChange={(e) => setLoadPath(e.target.value)} />
            </div>
            <Button type="submit" disabled={!loadId || !loadName || !loadPath}>
              <Plus className="h-4 w-4" />
              Load
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Create mode — multi-step wizard
  const isBasics = step === 0;
  const isKnowledgeStep = step === 5;
  const isLast = step === STEPS.length - 1;
  const canProceed = isBasics ? !!(id && name) : true;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">Create New Persona</CardTitle>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : isDone
                        ? 'bg-hover text-foreground'
                        : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 0: Basics */}
        {isBasics && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted">Persona Name</label>
              <Input
                placeholder="e.g. Cloud Architect"
                value={name}
                onChange={(e) => autoGenerateId(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">ID (auto-generated)</label>
              <Input
                placeholder="e.g. cloud-architect"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Lowercase with hyphens. Used as directory name.</p>
            </div>
          </div>
        )}

        {/* Step 1: Soul */}
        {step === 1 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted">Soul — Personality & Communication Style</label>
              <Badge variant="outline">SOUL.md</Badge>
            </div>
            <Textarea
              className="min-h-[300px] font-mono text-xs"
              placeholder={PLACEHOLDERS.soul}
              value={soul}
              onChange={(e) => setSoul(e.target.value)}
            />
          </div>
        )}

        {/* Step 2: Expertise */}
        {step === 2 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted">Expertise — Domain Knowledge & Boundaries</label>
              <Badge variant="outline">EXPERTISE.md</Badge>
            </div>
            <Textarea
              className="min-h-[300px] font-mono text-xs"
              placeholder={PLACEHOLDERS.expertise}
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
            />
          </div>
        )}

        {/* Step 3: Procedures */}
        {step === 3 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted">Procedures — SOPs & Runbooks</label>
              <Badge variant="outline">PROCEDURES.md</Badge>
            </div>
            <Textarea
              className="min-h-[300px] font-mono text-xs"
              placeholder={PLACEHOLDERS.procedures}
              value={procedures}
              onChange={(e) => setProcedures(e.target.value)}
            />
          </div>
        )}

        {/* Step 4: Tools */}
        {step === 4 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted">Tools — Authorized Tools & Integrations</label>
              <Badge variant="outline">TOOLS.md</Badge>
            </div>
            <Textarea
              className="min-h-[300px] font-mono text-xs"
              placeholder={PLACEHOLDERS.tools}
              value={tools}
              onChange={(e) => setTools(e.target.value)}
            />
          </div>
        )}

        {/* Step 5: Knowledge Base */}
        {isKnowledgeStep && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">
                Knowledge Base{' '}
                <span className="text-muted text-xs font-normal">(optional)</span>
              </p>
              <p className="text-xs text-muted mt-0.5">
                Attach a knowledge base so this persona can retrieve relevant documents during conversations.
              </p>
            </div>

            {/* Mode selector cards */}
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  {
                    value: 'none' as const,
                    label: 'Skip for now',
                    desc: 'Configure later from the persona detail page',
                  },
                  {
                    value: 'existing' as const,
                    label: 'Use existing KB',
                    desc: 'Pick from your knowledge bases',
                  },
                  {
                    value: 'new' as const,
                    label: 'Create new KB',
                    desc: 'Set up a fresh knowledge base',
                  },
                ]
              ).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setKbMode(value);
                    if (value !== 'existing') setSelectedKbId('');
                    if (value !== 'new') {
                      setNewKbName('');
                      setNewKbDomain('');
                    }
                    setCreatedKb(null);
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    kbMode === value
                      ? 'border-accent bg-accent/10 text-foreground'
                      : 'border-border hover:border-accent/50 hover:bg-hover'
                  }`}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{desc}</p>
                </button>
              ))}
            </div>

            {/* Existing KB picker */}
            {kbMode === 'existing' && (
              <div className="space-y-3">
                {kbsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading knowledge bases…
                  </div>
                ) : existingKbs.length === 0 ? (
                  <p className="text-sm text-muted">
                    No knowledge bases found.{' '}
                    <button
                      type="button"
                      className="text-accent underline"
                      onClick={() => setKbMode('new')}
                    >
                      Create one now
                    </button>
                    .
                  </p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-muted">Select a knowledge base</label>
                      <Select
                        value={selectedKbId}
                        onChange={(e) => setSelectedKbId(e.target.value)}
                      >
                        <option value="">— choose a knowledge base —</option>
                        {existingKbs.map((kb) => (
                          <option key={kb.id} value={kb.id}>
                            {kb.name} ({kb.domain}) — {kb.documentCount} docs
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Preview card for the selected KB */}
                    {selectedKbId &&
                      (() => {
                        const kb = existingKbs.find((k) => k.id === selectedKbId);
                        return kb ? (
                          <div className="rounded-md border border-accent/30 bg-accent/5 p-3 flex items-start gap-3">
                            <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                            <div className="text-xs space-y-0.5">
                              <p className="font-medium text-foreground">{kb.name}</p>
                              <p className="text-muted">
                                Domain: {kb.domain} · Provider: {kb.provider} · Model:{' '}
                                {kb.embeddingModel}
                              </p>
                              <p className="text-muted">
                                {kb.documentCount} documents · {kb.chunkCount} chunks
                              </p>
                            </div>
                          </div>
                        ) : null;
                      })()}
                  </>
                )}
              </div>
            )}

            {/* Create new KB inline */}
            {kbMode === 'new' && !createdKb && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wider">
                  New Knowledge Base
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Name</label>
                    <Input
                      placeholder="e.g. Cloud Architecture Docs"
                      value={newKbName}
                      onChange={(e) => setNewKbName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Domain</label>
                    <Input
                      placeholder="e.g. cloud-architecture"
                      value={newKbDomain}
                      onChange={(e) => setNewKbDomain(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateNewKb}
                  disabled={!newKbName || !newKbDomain || creatingKb}
                >
                  {creatingKb ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  {creatingKb ? 'Creating…' : 'Create Knowledge Base'}
                </Button>
              </div>
            )}

            {/* Confirmation when a newly created KB was auto-selected */}
            {kbMode === 'existing' && createdKb && selectedKbId === createdKb.id && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-foreground">Knowledge base created and linked!</p>
                  <p className="text-muted mt-0.5">
                    <span className="font-medium">{createdKb.name}</span> · {createdKb.domain}
                  </p>
                  <p className="text-muted">You can ingest documents from the Knowledge Base page.</p>
                </div>
              </div>
            )}

            {kbMode === 'none' && (
              <p className="text-xs text-muted">
                You can attach a knowledge base later from the persona detail page at any time.
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {!isBasics && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              Step {step + 1} of {STEPS.length}
            </span>
            {isLast ? (
              <Button onClick={handleCreateSubmit} disabled={!id || !name}>
                <Save className="h-4 w-4" />
                Create Persona
              </Button>
            ) : (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function nameToId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
