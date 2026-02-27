import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { azureKnowledgeApi } from '@/lib/azure-knowledge-api';
import { KnowledgeBaseList } from '@/components/knowledge/KnowledgeBaseList';
import { DocumentUpload } from '@/components/knowledge/DocumentUpload';
import { QueryTester } from '@/components/knowledge/QueryTester';
import { AzureKBList } from '@/components/knowledge/AzureKBList';
import { CreateAzureKBForm } from '@/components/knowledge/CreateAzureKBForm';
import { EditAzureKBForm } from '@/components/knowledge/EditAzureKBForm';
import { QueryPlayground } from '@/components/knowledge/QueryPlayground';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Cloud, Database, CheckCircle, XCircle } from 'lucide-react';
import type { AzureKnowledgeBase, AzureKnowledgeSource, CreateKBPayload } from '@/types/azure-knowledge';

type Tab = 'local' | 'azure';

export function KnowledgePage() {
  // Local KB state
  const { data: bases, loading, refetch } = useApi(() => api.getKnowledgeBases());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>('azure');

  // Azure KB state
  const {
    data: azureStatus,
    loading: azureStatusLoading,
  } = useApi(() => azureKnowledgeApi.getStatus());

  const {
    data: azureKBs,
    loading: azureLoading,
    refetch: refetchAzure,
  } = useApi(() => azureKnowledgeApi.listKnowledgeBases());

  const {
    data: azureSources,
    loading: azureSourcesLoading,
    refetch: refetchSources,
  } = useApi(() => azureKnowledgeApi.listKnowledgeSources());

  const [showAzureCreate, setShowAzureCreate] = useState(false);
  const [editingAzureKB, setEditingAzureKB] = useState<AzureKnowledgeBase | null>(null);

  // ── Local KB handlers ─────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newName || !newDomain) return;
    await api.createKnowledgeBase({ name: newName, domain: newDomain });
    setNewName('');
    setNewDomain('');
    setShowCreate(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await api.deleteKnowledgeBase(id);
    refetch();
  };

  const handleIngest = async (kbId: string, sourcePath: string, category?: string) => {
    await api.ingestDocuments(kbId, { sourcePath, category });
    refetch();
  };

  const handleQuery = (kbId: string, query: string) => {
    return api.queryKnowledgeBase(kbId, { query });
  };

  // ── Azure KB handlers ─────────────────────────────────────────────

  const handleAzureCreate = async (data: CreateKBPayload) => {
    await azureKnowledgeApi.createKnowledgeBase(data);
    setShowAzureCreate(false);
    refetchAzure();
  };

  const handleAzureSave = async (id: string, data: Partial<AzureKnowledgeBase>) => {
    await azureKnowledgeApi.updateKnowledgeBase(id, data);
    setEditingAzureKB(null);
    refetchAzure();
  };

  const handleAzureDelete = async (id: string) => {
    await azureKnowledgeApi.deleteKnowledgeBase(id);
    setEditingAzureKB(null);
    refetchAzure();
  };

  const handleSelectAzureKB = async (name: string) => {
    try {
      const kb = await azureKnowledgeApi.getKnowledgeBase(name);
      setEditingAzureKB(kb);
    } catch {
      // If fetch fails, use the list data
      const kb = (azureKBs ?? []).find((k) => k.name === name);
      if (kb) setEditingAzureKB(kb);
    }
  };

  const handleEditAzureKB = async (name: string) => {
    try {
      const kb = await azureKnowledgeApi.getKnowledgeBase(name);
      setEditingAzureKB(kb);
    } catch {
      const kb = (azureKBs ?? []).find((k) => k.name === name);
      if (kb) setEditingAzureKB(kb);
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  const kbList = bases ?? [];
  const azureKBList = azureKBs ?? [];
  const azureSourceList = (azureSources ?? []) as AzureKnowledgeSource[];
  const isAzureConfigured = azureStatus?.configured ?? false;

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Knowledge Bases</h2>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'azure'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-input text-muted hover:text-foreground'
              }`}
              onClick={() => setActiveTab('azure')}
            >
              <Cloud className="h-3 w-3 inline mr-1" />
              Azure AI Search
            </button>
            <button
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'local'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-input text-muted hover:text-foreground'
              }`}
              onClick={() => setActiveTab('local')}
            >
              <Database className="h-3 w-3 inline mr-1" />
              Local
            </button>
          </div>
        </div>

        {activeTab === 'local' && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Knowledge Base
          </Button>
        )}
        {activeTab === 'azure' && isAzureConfigured && (
          <Button size="sm" onClick={() => { setShowAzureCreate(true); setEditingAzureKB(null); }}>
            <Plus className="h-4 w-4" /> New Azure KB
          </Button>
        )}
      </div>

      {/* Azure tab */}
      {activeTab === 'azure' && (
        <>
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs text-muted">
            {azureStatusLoading ? (
              <span>Checking Azure connection...</span>
            ) : isAzureConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                <span>Connected to Azure AI Search</span>
                <Badge variant="outline">{azureStatus?.apiVersion}</Badge>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 text-red-400" />
                <span>
                  Azure AI Search not configured. Set{' '}
                  <code className="text-accent">AZURE_SEARCH_ENDPOINT</code> and{' '}
                  <code className="text-accent">AZURE_SEARCH_API_KEY</code> env vars.
                </span>
              </>
            )}
          </div>

          {/* Create form */}
          {showAzureCreate && (
            <CreateAzureKBForm
              knowledgeSources={azureSourceList.map((s) => ({ name: s.name, kind: s.kind }))}
              onSubmit={handleAzureCreate}
              onCancel={() => setShowAzureCreate(false)}
            />
          )}

          {/* Edit form */}
          {editingAzureKB && !showAzureCreate && (
            <EditAzureKBForm
              kb={editingAzureKB}
              onSave={handleAzureSave}
              onDelete={handleAzureDelete}
              onClose={() => setEditingAzureKB(null)}
            />
          )}

          {/* KB list */}
          {azureLoading ? (
            <p className="text-muted text-sm">Loading Azure knowledge bases...</p>
          ) : (
            <AzureKBList
              bases={azureKBList}
              onSelect={handleSelectAzureKB}
              onEdit={handleEditAzureKB}
            />
          )}

          {/* Playground */}
          {azureKBList.length > 0 && (
            <QueryPlayground knowledgeBases={azureKBList} />
          )}
        </>
      )}

      {/* Local tab */}
      {activeTab === 'local' && (
        <>
          {loading ? (
            <p className="text-muted">Loading knowledge bases...</p>
          ) : (
            <>
              {showCreate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Create Knowledge Base</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted">Name</label>
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. IT Runbooks" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted">Domain</label>
                        <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="e.g. it-ops" />
                      </div>
                      <Button onClick={handleCreate} disabled={!newName || !newDomain}>Create</Button>
                      <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <KnowledgeBaseList bases={kbList} onSelect={() => {}} onDelete={handleDelete} />

              {kbList.length > 0 && (
                <>
                  <DocumentUpload knowledgeBases={kbList} onIngest={handleIngest} />
                  <QueryTester knowledgeBases={kbList} onQuery={handleQuery} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
