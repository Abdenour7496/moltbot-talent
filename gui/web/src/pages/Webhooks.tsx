import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  ArrowLeft,
  Save,
  Copy,
} from 'lucide-react';

type View = 'list' | 'add' | 'edit';

export function WebhooksPage() {
  const { data: webhooks, loading, refetch } = useApi(() => api.getWebhooks());
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', path: '', secret: '', targetPersonaId: '', action: 'message' });

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.path.trim()) return;
    await api.createWebhook(formData);
    setFormData({ name: '', path: '', secret: '', targetPersonaId: '', action: 'message' });
    refetch();
    setView('list');
  };

  const handleUpdate = async () => {
    if (!selectedId) return;
    await api.updateWebhook(selectedId, formData);
    refetch();
    setView('list');
    setSelectedId(null);
  };

  const handleDelete = async (id: string) => {
    await api.deleteWebhook(id);
    refetch();
    if (selectedId === id) { setView('list'); setSelectedId(null); }
  };

  const handleTrigger = async (id: string) => {
    await api.triggerWebhook(id);
    refetch();
  };

  if (loading) return <p className="text-muted">Loading webhooks...</p>;

  const list = webhooks ?? [];

  // Form view (add or edit)
  if (view === 'add' || (view === 'edit' && selectedId)) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); setSelectedId(null); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">{view === 'add' ? 'Create Webhook' : 'Edit Webhook'}</h2>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Webhook Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Name *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. GitHub Push" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Path *</label>
              <Input value={formData.path} onChange={(e) => setFormData({ ...formData, path: e.target.value })} placeholder="/hooks/github" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Secret (optional)</label>
              <Input type="password" value={formData.secret} onChange={(e) => setFormData({ ...formData, secret: e.target.value })} placeholder="Webhook secret for verification" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Target Persona ID</label>
              <Input value={formData.targetPersonaId} onChange={(e) => setFormData({ ...formData, targetPersonaId: e.target.value })} placeholder="e.g. it-ops-specialist" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Action</label>
              <Select value={formData.action} onChange={(e) => setFormData({ ...formData, action: e.target.value })}>
                <option value="message">Message</option>
                <option value="alert">Alert</option>
                <option value="trigger">Trigger Task</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button onClick={view === 'add' ? handleCreate : handleUpdate} disabled={!formData.name.trim() || !formData.path.trim()}>
            <Save className="h-4 w-4" /> {view === 'add' ? 'Create' : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => { setView('list'); setSelectedId(null); }}>Cancel</Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inbound Webhooks</h2>
        <Button size="sm" onClick={() => { setFormData({ name: '', path: '', secret: '', targetPersonaId: '', action: 'message' }); setView('add'); }}>
          <Plus className="h-3.5 w-3.5" /> Create Webhook
        </Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Webhook className="h-10 w-10 text-muted mb-3" />
            <p className="text-sm text-muted">No webhook endpoints configured.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((wh: any) => (
            <Card key={wh.id}>
              <CardContent className="flex items-center justify-between p-4 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{wh.name}</h3>
                    <Badge variant={wh.enabled ? 'success' : 'outline'}>{wh.enabled ? 'Active' : 'Disabled'}</Badge>
                    <Badge variant="outline">{wh.action}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-code px-2 py-0.5 rounded font-mono">{wh.path}</code>
                    <span className="text-xs text-muted">{wh.triggerCount} triggers</span>
                    {wh.lastTriggeredAt && <span className="text-xs text-muted">· Last: {new Date(wh.lastTriggeredAt).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedId(wh.id); setFormData({ name: wh.name, path: wh.path, secret: wh.secret ?? '', targetPersonaId: wh.targetPersonaId ?? '', action: wh.action }); setView('edit'); }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleTrigger(wh.id)}>
                    <Play className="h-3 w-3" /> Test
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(wh.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
