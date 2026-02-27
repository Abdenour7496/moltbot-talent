/**
 * KnowledgeBasePanel
 *
 * Shown inside the PersonaDetail view. Displays the currently linked
 * knowledge base and lets the user:
 *   • Assign a different existing KB
 *   • Create a brand-new KB and immediately link it
 *   • Detach the current KB
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
  Database,
  Link2,
  Link2Off,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  RefreshCw,
} from 'lucide-react';

interface KnowledgeBaseInfo {
  id: string;
  name: string;
  domain: string;
  documentCount: number;
  chunkCount: number;
  provider: string;
  embeddingModel: string;
  createdAt: string;
}

interface KnowledgeBasePanelProps {
  personaId: string;
  personaName: string;
}

type PanelMode = 'view' | 'pick' | 'create';

export function KnowledgeBasePanel({ personaId, personaName }: KnowledgeBasePanelProps) {
  const [currentKb, setCurrentKb] = useState<KnowledgeBaseInfo | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  // Picker state
  const [mode, setMode] = useState<PanelMode>('view');
  const [allKbs, setAllKbs] = useState<KnowledgeBaseInfo[]>([]);
  const [allKbsLoading, setAllKbsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  // Create inline state
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Assign / detach state
  const [assigning, setAssigning] = useState(false);
  const [detaching, setDetaching] = useState(false);
  const [actionError, setActionError] = useState('');

  /* ── Load the currently linked KB ── */
  const fetchCurrent = useCallback(async () => {
    setLoadingCurrent(true);
    try {
      const { knowledgeBase } = await api.getPersonaKnowledge(personaId);
      setCurrentKb(knowledgeBase);
    } catch {
      setCurrentKb(null);
    } finally {
      setLoadingCurrent(false);
    }
  }, [personaId]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  /* ── Load all KBs when picker opens ── */
  useEffect(() => {
    if (mode === 'pick') {
      setAllKbsLoading(true);
      api
        .getKnowledgeBases()
        .then((kbs) => {
          setAllKbs(kbs);
          if (currentKb) setSelectedId(currentKb.id);
        })
        .catch(() => {})
        .finally(() => setAllKbsLoading(false));
    }
  }, [mode, currentKb]);

  /* ── Assign an existing KB ── */
  const handleAssign = async () => {
    if (!selectedId) return;
    setAssigning(true);
    setActionError('');
    try {
      const { knowledgeBase } = await api.assignKnowledgeBase(personaId, selectedId);
      setCurrentKb(knowledgeBase);
      setMode('view');
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to assign knowledge base');
    } finally {
      setAssigning(false);
    }
  };

  /* ── Create a new KB and link it ── */
  const handleCreateAndLink = async () => {
    if (!newName || !newDomain) return;
    setCreating(true);
    setCreateError('');
    try {
      const kb = await api.createKnowledgeBase({ name: newName, domain: newDomain });
      const { knowledgeBase } = await api.assignKnowledgeBase(personaId, kb.id);
      setCurrentKb(knowledgeBase);
      setMode('view');
      setNewName('');
      setNewDomain('');
    } catch (e: any) {
      setCreateError(e.message ?? 'Failed to create knowledge base');
    } finally {
      setCreating(false);
    }
  };

  /* ── Detach the current KB ── */
  const handleDetach = async () => {
    setDetaching(true);
    setActionError('');
    try {
      await api.detachKnowledgeBase(personaId);
      setCurrentKb(null);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to detach knowledge base');
    } finally {
      setDetaching(false);
    }
  };

  const cancelPicker = () => {
    setMode('view');
    setSelectedId('');
    setNewName('');
    setNewDomain('');
    setActionError('');
    setCreateError('');
  };

  /* ─────────────────────── RENDER ─────────────────────── */

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Knowledge Base</CardTitle>
          {currentKb && (
            <Badge variant="success" className="text-[10px]">
              Linked
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'view' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCurrent}
                disabled={loadingCurrent}
                title="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingCurrent ? 'animate-spin' : ''}`} />
              </Button>
              {currentKb ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode('pick')}>
                    <Link2 className="h-3.5 w-3.5" />
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDetach}
                    disabled={detaching}
                    className="text-destructive hover:text-destructive"
                  >
                    {detaching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link2Off className="h-3.5 w-3.5" />
                    )}
                    Detach
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode('pick')}>
                    <Link2 className="h-3.5 w-3.5" />
                    Assign KB
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMode('create')}>
                    <Plus className="h-3.5 w-3.5" />
                    New KB
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Error banner */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {actionError}
          </div>
        )}

        {/* ── VIEW mode ── */}
        {mode === 'view' && (
          <>
            {loadingCurrent ? (
              <div className="flex items-center gap-2 text-sm text-muted py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : currentKb ? (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{currentKb.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      Domain: <span className="text-foreground">{currentKb.domain}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {currentKb.provider}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Stat
                    icon={<FileText className="h-3 w-3" />}
                    label="Documents"
                    value={currentKb.documentCount}
                  />
                  <Stat
                    icon={<Layers className="h-3 w-3" />}
                    label="Chunks"
                    value={currentKb.chunkCount}
                  />
                  <div className="rounded-md bg-hover px-3 py-2">
                    <p className="text-[10px] text-muted uppercase tracking-wide">Model</p>
                    <p className="text-xs font-medium mt-0.5 truncate" title={currentKb.embeddingModel}>
                      {currentKb.embeddingModel}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  This knowledge base will be queried when{' '}
                  <span className="font-medium text-foreground">{personaName}</span> needs domain context.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border border-dashed p-6 text-center space-y-2">
                <Database className="h-8 w-8 text-muted mx-auto" />
                <p className="text-sm font-medium">No knowledge base linked</p>
                <p className="text-xs text-muted">
                  Assign a knowledge base to give this persona access to domain-specific documents
                  during conversations.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── PICK mode — select from existing KBs ── */}
        {mode === 'pick' && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Select a knowledge base to link to{' '}
              <span className="font-medium text-foreground">{personaName}</span>.
            </p>

            {allKbsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : allKbs.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted">No knowledge bases found.</p>
                <Button size="sm" variant="outline" onClick={() => setMode('create')}>
                  <Plus className="h-3.5 w-3.5" />
                  Create one now
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  <option value="">— choose a knowledge base —</option>
                  {allKbs.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name} ({kb.domain}) — {kb.documentCount} docs
                    </option>
                  ))}
                </Select>

                {selectedId &&
                  (() => {
                    const kb = allKbs.find((k) => k.id === selectedId);
                    return kb ? (
                      <div className="rounded-md border border-accent/20 bg-accent/5 p-3 flex items-start gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">{kb.name}</p>
                          <p className="text-muted">
                            {kb.domain} · {kb.provider} · {kb.documentCount} docs · {kb.chunkCount} chunks
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
              </div>
            )}

            {/* Divider + create option */}
            {!allKbsLoading && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted">or</span>
                <div className="flex-1 border-t border-border" />
              </div>
            )}
            {!allKbsLoading && (
              <Button size="sm" variant="ghost" onClick={() => setMode('create')} className="w-full">
                <Plus className="h-3.5 w-3.5" />
                Create a new knowledge base
              </Button>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={!selectedId || assigning}
              >
                {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                {assigning ? 'Assigning…' : 'Assign'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelPicker}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── CREATE mode — new KB inline ── */}
        {mode === 'create' && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Create a new knowledge base and immediately link it to{' '}
              <span className="font-medium text-foreground">{personaName}</span>.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted">Name</label>
                <Input
                  placeholder="e.g. IT Runbooks"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted">Domain</label>
                <Input
                  placeholder="e.g. it-operations"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
            </div>

            {createError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {createError}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCreateAndLink}
                disabled={!newName || !newDomain || creating}
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Database className="h-3.5 w-3.5" />
                )}
                {creating ? 'Creating…' : 'Create & Link'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelPicker}>
                Cancel
              </Button>
              {!creating && (
                <Button size="sm" variant="ghost" onClick={() => setMode('pick')}>
                  Or pick existing
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* Small helper stat card */
function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md bg-hover px-3 py-2">
      <div className="flex items-center gap-1 text-muted mb-0.5">
        {icon}
        <p className="text-[10px] uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
