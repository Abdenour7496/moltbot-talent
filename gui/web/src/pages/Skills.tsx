import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Puzzle,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Save,
  Download,
} from 'lucide-react';

type View = 'list' | 'add' | 'detail';

export function SkillsPage() {
  const { data: skills, loading, refetch } = useApi(() => api.getSkills());
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [filter, setFilter] = useState('all');

  // Add form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [source, setSource] = useState('workspace');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await api.createSkill({ name: name.trim(), description: description.trim(), category, source });
    setName('');
    setDescription('');
    refetch();
    setView('list');
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await api.updateSkill(id, { enabled: !enabled });
    refetch();
  };

  const handleDelete = async (id: string) => {
    await api.deleteSkill(id);
    refetch();
    if (selectedId === id) { setSelectedId(null); setView('list'); }
  };

  if (loading) return <p className="text-muted">Loading skills...</p>;

  const list = skills ?? [];
  const selected = list.find((s: any) => s.id === selectedId);

  // Detail view
  if (view === 'detail' && selected) {
    return <SkillDetail skill={selected} onBack={() => { setView('list'); setSelectedId(null); }} onToggle={handleToggle} onDelete={handleDelete} refetch={refetch} />;
  }

  // Add view
  if (view === 'add') {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">Install Skill</h2>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Skill Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Web Search" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this skill do?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted">Category</label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="bundled">Bundled</option>
                  <option value="managed">Managed</option>
                  <option value="workspace">Workspace</option>
                  <option value="custom">Custom</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted">Source</label>
                <Select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="bundled">Bundled</option>
                  <option value="registry">Registry</option>
                  <option value="workspace">Workspace</option>
                  <option value="url">URL</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button onClick={handleCreate} disabled={!name.trim()}>
            <Download className="h-4 w-4" /> Install Skill
          </Button>
          <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
        </div>
      </div>
    );
  }

  // List view
  const categories = ['all', 'bundled', 'managed', 'workspace', 'custom'];
  const filtered = filter === 'all' ? list : list.filter((s: any) => s.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {categories.map((c) => (
            <Button key={c} size="sm" variant={filter === c ? 'default' : 'outline'} onClick={() => setFilter(c)}>
              {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setView('add')}>
          <Plus className="h-3.5 w-3.5" /> Install Skill
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Puzzle className="h-10 w-10 text-muted mb-3" />
            <p className="text-sm text-muted">No skills installed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill: any) => (
            <Card key={skill.id} className="cursor-pointer hover:border-accent/50 transition-colors" onClick={() => { setSelectedId(skill.id); setView('detail'); }}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{skill.name}</h3>
                    <p className="text-xs text-muted mt-0.5">v{skill.version}</p>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={skill.enabled ? 'success' : 'outline'}>
                      {skill.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline">{skill.category}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); handleToggle(skill.id, skill.enabled); }}>
                    {skill.enabled ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                    {skill.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(skill.id); }}>
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

function SkillDetail({ skill, onBack, onToggle, onDelete, refetch }: { skill: any; onBack: () => void; onToggle: (id: string, enabled: boolean) => void; onDelete: (id: string) => void; refetch: () => void }) {
  const [config, setConfig] = useState<Record<string, string>>({ ...skill.config });

  const handleSave = async () => {
    await api.updateSkill(skill.id, { config });
    refetch();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h2 className="text-xl font-semibold">{skill.name}</h2>
        <Badge variant={skill.enabled ? 'success' : 'outline'}>{skill.enabled ? 'Active' : 'Disabled'}</Badge>
        <Badge variant="outline">{skill.category}</Badge>
        <span className="text-xs text-muted ml-auto">v{skill.version} · {skill.source}</span>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{skill.description}</p>
          <p className="text-xs text-muted mt-2">Installed: {new Date(skill.installedAt).toLocaleDateString()}</p>
        </CardContent>
      </Card>

      {Object.keys(config).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-muted capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                <Input
                  value={value}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                  placeholder={`Enter ${key}...`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave}><Save className="h-4 w-4" /> Save</Button>
        <Button variant="outline" onClick={() => onToggle(skill.id, skill.enabled)}>
          {skill.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          {skill.enabled ? 'Disable' : 'Enable'}
        </Button>
        <Button variant="destructive" onClick={() => onDelete(skill.id)}>
          <Trash2 className="h-4 w-4" /> Remove
        </Button>
      </div>
    </div>
  );
}
