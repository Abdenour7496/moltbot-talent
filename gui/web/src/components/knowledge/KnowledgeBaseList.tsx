import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Trash2, Database } from 'lucide-react';

interface KB {
  id: string;
  name: string;
  domain: string;
  documentCount: number;
  chunkCount: number;
  provider: string;
  embeddingModel: string;
}

interface KnowledgeBaseListProps {
  bases: KB[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function KnowledgeBaseList({ bases, onSelect, onDelete }: KnowledgeBaseListProps) {
  if (bases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm text-muted">No knowledge bases created yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bases.map((kb) => (
        <Card key={kb.id} className="cursor-pointer hover:border-accent/50 transition-colors" onClick={() => onSelect(kb.id)}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{kb.name}</h3>
                <p className="text-xs text-muted mt-0.5">{kb.domain}</p>
              </div>
              <Badge variant="outline">{kb.provider}</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span>{kb.documentCount} docs</span>
              <span>{kb.chunkCount} chunks</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Database className="h-3 w-3" />
                {kb.embeddingModel}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(kb.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
