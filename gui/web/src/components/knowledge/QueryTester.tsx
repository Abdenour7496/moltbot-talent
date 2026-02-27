import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

interface QueryResult {
  chunk: {
    id: string;
    content: string;
    metadata: {
      source: string;
      category: string;
    };
  };
  score: number;
}

interface QueryTesterProps {
  knowledgeBases: Array<{ id: string; name: string }>;
  onQuery: (kbId: string, query: string) => Promise<{ results: QueryResult[] }>;
}

export function QueryTester({ knowledgeBases, onQuery }: QueryTesterProps) {
  const [kbId, setKbId] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbId || !query) return;
    setLoading(true);
    try {
      const res = await onQuery(kbId, query);
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Query Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="flex-[3] space-y-1">
            <label className="text-xs text-muted">Query</label>
            <Input
              placeholder="Ask a question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!kbId || !query || loading}>
            <Search className="h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.chunk.id} className="rounded-md border border-border bg-input/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted truncate">{r.chunk.metadata.source}</span>
                  <Badge variant={r.score > 0.8 ? 'success' : r.score > 0.6 ? 'warning' : 'destructive'}>
                    {(r.score * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-sm">{r.chunk.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
