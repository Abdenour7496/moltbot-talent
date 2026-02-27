import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

interface CreateComputerFormProps {
  workspaces: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  onBack: () => void;
  onSubmit: (data: {
    workspaceId: string;
    name: string;
    ram?: number;
    cpu?: number;
    gpu?: string;
    templateId?: string;
  }) => void;
}

export function CreateComputerForm({ workspaces, templates, onBack, onSubmit }: CreateComputerFormProps) {
  const [name, setName] = useState('');
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [ram, setRam] = useState('4096');
  const [cpu, setCpu] = useState('2');
  const [gpu, setGpu] = useState('');
  const [templateId, setTemplateId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !workspaceId) return;
    onSubmit({
      workspaceId,
      name,
      ram: +ram,
      cpu: +cpu,
      gpu: gpu || undefined,
      templateId: templateId || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Create Computer</h2>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="text-sm font-medium block mb-1">Workspace</label>
              <Select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <Input
                placeholder="e.g. web-scraper-agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">RAM (MB)</label>
                <Select value={ram} onChange={(e) => setRam(e.target.value)}>
                  <option value="2048">2 GB</option>
                  <option value="4096">4 GB</option>
                  <option value="8192">8 GB</option>
                  <option value="16384">16 GB</option>
                  <option value="32768">32 GB</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">vCPU</label>
                <Select value={cpu} onChange={(e) => setCpu(e.target.value)}>
                  <option value="1">1 vCPU</option>
                  <option value="2">2 vCPU</option>
                  <option value="4">4 vCPU</option>
                  <option value="8">8 vCPU</option>
                  <option value="16">16 vCPU</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">GPU (optional)</label>
              <Input
                placeholder="e.g. nvidia-t4"
                value={gpu}
                onChange={(e) => setGpu(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Template (optional)</label>
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">None</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!name || !workspaceId}>
                Create Computer
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
