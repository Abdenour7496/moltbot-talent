import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Brain, Pencil, Database, Globe, HardDrive, FileText, Zap } from 'lucide-react';
import type { AzureKnowledgeBase } from '@/types/azure-knowledge';

interface AzureKBCardProps {
  kb: AzureKnowledgeBase;
  onSelect: (name: string) => void;
  onEdit: (name: string) => void;
}

const MODE_LABELS: Record<string, string> = {
  answerSynthesis: 'Answer Synthesis',
  extractiveData: 'Extractive Data',
};

const EFFORT_COLORS: Record<string, string> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
};

export function AzureKBCard({ kb, onSelect, onEdit }: AzureKBCardProps) {
  const sourceCount = kb.knowledgeSources?.length ?? 0;
  const modelCount = kb.models?.length ?? 0;

  return (
    <Card
      className="cursor-pointer hover:border-accent/50 transition-colors"
      onClick={() => onSelect(kb.name)}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{kb.name}</h3>
            {kb.description && (
              <p className="text-xs text-muted mt-0.5 line-clamp-2">{kb.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(kb.name);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">
            {MODE_LABELS[kb.outputMode ?? 'answerSynthesis'] ?? kb.outputMode}
          </Badge>
          {kb.retrievalReasoningEffort && (
            <Badge variant={(EFFORT_COLORS[kb.retrievalReasoningEffort] ?? 'outline') as any}>
              <Zap className="h-3 w-3 mr-0.5" />
              {kb.retrievalReasoningEffort}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {sourceCount} source{sourceCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            {modelCount} model{modelCount !== 1 ? 's' : ''}
          </span>
        </div>

        {kb.knowledgeSources && kb.knowledgeSources.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {kb.knowledgeSources.slice(0, 3).map((src) => (
              <span
                key={src}
                className="inline-flex items-center gap-1 rounded bg-input/50 px-1.5 py-0.5 text-[10px] text-muted"
              >
                {src}
              </span>
            ))}
            {kb.knowledgeSources.length > 3 && (
              <span className="text-[10px] text-muted">
                +{kb.knowledgeSources.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AzureKBListProps {
  bases: AzureKnowledgeBase[];
  onSelect: (name: string) => void;
  onEdit: (name: string) => void;
}

export function AzureKBList({ bases, onSelect, onEdit }: AzureKBListProps) {
  if (bases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm text-muted">No Azure knowledge bases found.</p>
          <p className="text-xs text-muted mt-1">Create one or check your Azure Search configuration.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bases.map((kb) => (
        <AzureKBCard key={kb.name} kb={kb} onSelect={onSelect} onEdit={onEdit} />
      ))}
    </div>
  );
}
