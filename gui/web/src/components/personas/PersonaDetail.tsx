import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, Brain } from 'lucide-react';
import Markdown from 'react-markdown';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';

interface PersonaDetailProps {
  persona: {
    id: string;
    name: string;
    path: string;
    active: boolean;
    soul: string;
    expertise: string;
    procedures: string;
    tools: string;
    integrations: string[];
  };
  onBack: () => void;
  onActivate: (id: string) => void;
  onConfigureBrain: (id: string) => void;
}

function MarkdownSection({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="prose prose-invert prose-sm max-w-none">
        <Markdown>{content}</Markdown>
      </CardContent>
    </Card>
  );
}

export function PersonaDetail({ persona, onBack, onActivate, onConfigureBrain }: PersonaDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{persona.name}</h2>
            <p className="text-sm text-muted">{persona.id}</p>
          </div>
          <Badge variant={persona.active ? 'success' : 'outline'}>
            {persona.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onConfigureBrain(persona.id)}>
            <Brain className="h-4 w-4" />
            Configure Brain
          </Button>
          {!persona.active && (
            <Button onClick={() => onActivate(persona.id)}>
              <Zap className="h-4 w-4" />
              Activate
            </Button>
          )}
        </div>
      </div>

      <div className="text-sm text-muted">
        <span className="font-medium text-foreground">Path:</span> {persona.path}
      </div>

      {persona.integrations.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Integrations:</span>
          {persona.integrations.map((i) => (
            <Badge key={i} variant="outline">{i}</Badge>
          ))}
        </div>
      )}

      {/* Knowledge Base panel — full-width so KB stats are easy to read */}
      <KnowledgeBasePanel personaId={persona.id} personaName={persona.name} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MarkdownSection title="Soul" content={persona.soul} />
        <MarkdownSection title="Expertise" content={persona.expertise} />
        <MarkdownSection title="Procedures" content={persona.procedures} />
        <MarkdownSection title="Tools" content={persona.tools} />
      </div>
    </div>
  );
}
