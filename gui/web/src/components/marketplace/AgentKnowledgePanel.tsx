/**
 * AgentKnowledgePanel
 *
 * Shown inside the AgentConfigure page. Displays the currently linked
 * knowledge base for a marketplace agent and lets the user:
 *   • Assign a local or Azure AI Search KB
 *   • Create a brand-new local KB and immediately link it
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
  Cloud,
} from 'lucide-react';

interface KbInfo {
  id: string;
  name: string;
  domain: string;
  documentCount: number;
  chunkCount: number;
  provider: string;
  embeddingModel: string;
  type?: 'local' | 'azure';
}

interface AgentKnowledgePanelProps {
  agentId: string;
  agentName: string;
}

type PanelMode = 'view' | 'pick' | 'create';
type PickTab = 'local' | 'azure';

export function AgentKnowledgePanel({ agentId, agentName }: AgentKnowledgePanelProps) {
  const [currentKb, setCurrentKb] = useState<KbInfo | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const [mode, setMode] = useState<PanelMode>('view');
  const [pickTab, setPickTab] = useState<PickTab>('local');

  // Local KBs
  const [localKbs, setLocalKbs] = useState<KbInfo[]>([]);
  const [localKbsLoading, setLocalKbsLoading] = useState(false);
  const [selectedLocalId, setSelectedLocalId] = useState('');

  // Azure KBs
  const [azureKbs, setAzureKbs] = useState<any[]>([]);
  const [azureKbsLoading, setAzureKbsLoading] = useState(false);
  const [azureConfigured, setAzureConfigured] = useState<boolean | null>(null);
  const [selectedAzureId, setSelectedAzureId] = useState('');

  // Create inline (local only)
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [assigning, setAssigning] = useState(false);
  const [detaching, setDetaching] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchCurrent = useCallback(async () => {
    setLoadingCurrent(true);
    try {
      const { knowledgeBase } = await api.getAgentKnowledge(agentId);
      setCurrentKb(knowledgeBase);
    } catch {
      setCurrentKb(null);
    } finally {
      setLoadingCurrent(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  /* Load KBs when picker opens */
  useEffect(() => {
    if (mode !== 'pick') return;

    setLocalKbsLoading(true);
    api.getKnowledgeBases()
      .then((kbs) => {
        setLocalKbs(kbs);
        if (currentKb?.type !== 'azure' && currentKb) setSelectedLocalId(currentKb.id);
      })
      .catch(() => {})
      .finally(() => setLocalKbsLoading(false));

    setAzureKbsLoading(true);
    // Check Azure status first, then list
    api.getAzureKnowledgeBases()
      .then((kbs) => { setAzureKbs(kbs); setAzureConfigured(true); })
      .catch(() => { setAzureConfigured(false); })
      .finally(() => setAzureKbsLoading(false));

    // Pre-select current Azure KB tab if currently linked to Azure
    if (currentKb?.type === 'azure') {
      setPickTab('azure');
      setSelectedAzureId(currentKb.id);
    }
  }, [mode, currentKb]);

  const handleAssign = async () => {
    setAssigning(true);
    setActionError('');
    try {
      if (pickTab === 'azure') {
        if (!selectedAzureId) return;
        const { knowledgeBase } = await api.assignAgentKnowledge(agentId, selectedAzureId, 'azure');
        setCurrentKb(knowledgeBase);
      } else {
        if (!selectedLocalId) return;
        const { knowledgeBase } = await api.assignAgentKnowledge(agentId, selectedLocalId, 'local');
        setCurrentKb(knowledgeBase);
      }
      setMode('view');
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to assign knowledge base');
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!newName || !newDomain) return;
    setCreating(true);
    setCreateError('');
    try {
      const kb = await api.createKnowledgeBase({ name: newName, domain: newDomain });
      const { knowledgeBase } = await api.assignAgentKnowledge(agentId, kb.id, 'local');
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

  const handleDetach = async () => {
    setDetaching(true);
    setActionError('');
    try {
      await api.detachAgentKnowledge(agentId);
      setCurrentKb(null);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to detach knowledge base');
    } finally {
      setDetaching(false);
    }
  };

  const cancelPicker = () => {
    setMode('view');
    setSelectedLocalId('');
    setSelectedAzureId('');
    setNewName('');
    setNewDomain('');
    setActionError('');
    setCreateError('');
  };

  const isAzure = currentKb?.type === 'azure' || currentKb?.provider === 'azure-search';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          {isAzure ? <Cloud className="h-4 w-4 text-accent" /> : <Database className="h-4 w-4 text-accent" />}
          <CardTitle className="text-base">Knowledge Base</CardTitle>
          {currentKb && (
            <Badge variant="success" className="text-[10px]">Linked</Badge>
          )}
          {isAzure && (
            <Badge variant="outline" className="text-[10px]">Azure AI Search</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'view' && (
            <>
              <Button variant="outline" size="sm" onClick={fetchCurrent} disabled={loadingCurrent} title="Refresh">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingCurrent ? 'animate-spin' : ''}`} />
              </Button>
              {currentKb ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode('pick')}>
                    <Link2 className="h-3.5 w-3.5" /> Change
                  </Button>
                  <Button
                    variant="ghost" size="sm" onClick={handleDetach} disabled={detaching}
                    className="text-destructive hover:text-destructive"
                  >
                    {detaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
                    Detach
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode('pick')}>
                    <Link2 className="h-3.5 w-3.5" /> Assign KB
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMode('create')}>
                    <Plus className="h-3.5 w-3.5" /> New KB
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
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
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : currentKb ? (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{currentKb.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {isAzure ? 'Azure AI Search index' : <>Domain: <span className="text-foreground">{currentKb.domain}</span></>}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {isAzure ? 'azure-search' : currentKb.provider}
                  </Badge>
                </div>
                {!isAzure && (
                  <div className="grid grid-cols-3 gap-3">
                    <Stat icon={<FileText className="h-3 w-3" />} label="Documents" value={currentKb.documentCount} />
                    <Stat icon={<Layers className="h-3 w-3" />} label="Chunks" value={currentKb.chunkCount} />
                    <div className="rounded-md bg-hover px-3 py-2">
                      <p className="text-[10px] text-muted uppercase tracking-wide">Model</p>
                      <p className="text-xs font-medium mt-0.5 truncate" title={currentKb.embeddingModel}>
                        {currentKb.embeddingModel}
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted">
                  This knowledge base will be queried when{' '}
                  <span className="font-medium text-foreground">{agentName}</span> needs domain context.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border border-dashed p-6 text-center space-y-2">
                <Database className="h-8 w-8 text-muted mx-auto" />
                <p className="text-sm font-medium">No knowledge base linked</p>
                <p className="text-xs text-muted">
                  Assign a local or Azure AI Search knowledge base to give this agent access to domain-specific documents.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── PICK mode ── */}
        {mode === 'pick' && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Select a knowledge base to link to{' '}
              <span className="font-medium text-foreground">{agentName}</span>.
            </p>

            {/* Tab toggle: Local / Azure */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium w-fit">
              <button
                onClick={() => setPickTab('local')}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                  pickTab === 'local' ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                <Database className="h-3 w-3" /> Local
              </button>
              <button
                onClick={() => setPickTab('azure')}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                  pickTab === 'azure' ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                <Cloud className="h-3 w-3" /> Azure AI Search
              </button>
            </div>

            {/* Local KB list */}
            {pickTab === 'local' && (
              <div className="space-y-2">
                {localKbsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : localKbs.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">No local knowledge bases found.</p>
                    <Button size="sm" variant="outline" onClick={() => setMode('create')}>
                      <Plus className="h-3.5 w-3.5" /> Create one now
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select value={selectedLocalId} onChange={(e) => setSelectedLocalId(e.target.value)}>
                      <option value="">— choose a knowledge base —</option>
                      {localKbs.map((kb) => (
                        <option key={kb.id} value={kb.id}>
                          {kb.name} ({kb.domain}) — {kb.documentCount} docs
                        </option>
                      ))}
                    </Select>
                    {selectedLocalId && (() => {
                      const kb = localKbs.find((k) => k.id === selectedLocalId);
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
                  </>
                )}

                {!localKbsLoading && (
                  <>
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 border-t border-border" />
                      <span className="text-xs text-muted">or</span>
                      <div className="flex-1 border-t border-border" />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setMode('create')} className="w-full">
                      <Plus className="h-3.5 w-3.5" /> Create a new local knowledge base
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Azure AI Search KB list */}
            {pickTab === 'azure' && (
              <div className="space-y-2">
                {azureKbsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading Azure knowledge bases…
                  </div>
                ) : azureConfigured === false ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 space-y-1">
                    <p className="font-medium">Azure AI Search not configured</p>
                    <p>Set <code>AZURE_SEARCH_ENDPOINT</code> and <code>AZURE_SEARCH_API_KEY</code> environment variables, then restart the API server.</p>
                  </div>
                ) : azureKbs.length === 0 ? (
                  <p className="text-sm text-muted">No Azure AI Search knowledge bases found. Create one in the Knowledge Base page.</p>
                ) : (
                  <>
                    <Select value={selectedAzureId} onChange={(e) => setSelectedAzureId(e.target.value)}>
                      <option value="">— choose an Azure knowledge base —</option>
                      {azureKbs.map((kb: any) => (
                        <option key={kb.name ?? kb.id} value={kb.name ?? kb.id}>
                          {kb.name ?? kb.id}{kb.description ? ` — ${kb.description}` : ''}
                        </option>
                      ))}
                    </Select>
                    {selectedAzureId && (
                      <div className="rounded-md border border-accent/20 bg-accent/5 p-3 flex items-start gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">{selectedAzureId}</p>
                          <p className="text-muted">Azure AI Search · Foundry IQ</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={(pickTab === 'local' ? !selectedLocalId : !selectedAzureId) || assigning}
              >
                {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                {assigning ? 'Assigning…' : 'Assign'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelPicker}>Cancel</Button>
            </div>
          </div>
        )}

        {/* ── CREATE mode (local KB only) ── */}
        {mode === 'create' && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Create a new local knowledge base and immediately link it to{' '}
              <span className="font-medium text-foreground">{agentName}</span>.
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
                <AlertCircle className="h-3 w-3" /> {createError}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCreateAndLink} disabled={!newName || !newDomain || creating}>
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                {creating ? 'Creating…' : 'Create & Link'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelPicker}>Cancel</Button>
              {!creating && (
                <Button size="sm" variant="ghost" onClick={() => setMode('pick')}>Or pick existing</Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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
