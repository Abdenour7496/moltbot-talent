import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen } from 'lucide-react';

interface DocumentUploadProps {
  knowledgeBases: Array<{ id: string; name: string }>;
  onIngest: (kbId: string, sourcePath: string, category?: string) => void;
}

export function DocumentUpload({ knowledgeBases, onIngest }: DocumentUploadProps) {
  const [kbId, setKbId] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbId || !sourcePath) return;
    onIngest(kbId, sourcePath, category || undefined);
    setSourcePath('');
    setCategory('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ingest Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted">Knowledge Base</label>
            <select
              className="flex h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground"
              value={kbId}
              onChange={(e) => setKbId(e.target.value)}
            >
              <option value="">Select KB...</option>
              {knowledgeBases.map((kb) => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-[2] space-y-1">
            <label className="text-xs text-muted">Source Path</label>
            <Input
              placeholder="e.g. ./runbooks"
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted">Category</label>
            <Input
              placeholder="e.g. runbook"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!kbId || !sourcePath}>
            <FolderOpen className="h-4 w-4" />
            Ingest
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
