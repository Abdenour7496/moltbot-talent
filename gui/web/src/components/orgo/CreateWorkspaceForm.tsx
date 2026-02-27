import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

interface CreateWorkspaceFormProps {
  onBack: () => void;
  onSubmit: (data: { name: string }) => void;
}

export function CreateWorkspaceForm({ onBack, onSubmit }: CreateWorkspaceFormProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSubmit({ name });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Create Workspace</h2>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="text-sm font-medium block mb-1">Workspace Name</label>
              <Input
                placeholder="e.g. production, staging, research..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted mt-1">
                Workspaces help you organize your computers into logical groups.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!name}>
                Create Workspace
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
