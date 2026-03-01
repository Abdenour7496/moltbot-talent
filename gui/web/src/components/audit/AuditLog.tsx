import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

interface AuditEntry {
  id: string;
  timestamp: string;
  persona: string;
  action: string;
  target?: string;
  outcome: string;
  details?: Record<string, unknown>;
}

interface RetrievalDetails {
  query?: string;
  kbId?: string;
  chunkCount?: number;
  retrievalIds?: string[];
  sources?: string[];
  error?: string;
}

interface AuditLogProps {
  entries: AuditEntry[];
  onFilter: (filters: Record<string, string>) => void;
}

function RetrievalDetailPanel({
  details,
  outcome,
  onChunkFilter,
}: {
  details: RetrievalDetails;
  outcome: string;
  onChunkFilter: (chunkId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {details.query && (
        <div>
          <p className="text-xs font-medium text-muted mb-1">Query</p>
          <p className="text-xs italic">&ldquo;{details.query}&rdquo;</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {details.kbId && (
          <div>
            <p className="text-xs font-medium text-muted mb-1">Knowledge Base</p>
            <Badge variant="default">{details.kbId}</Badge>
          </div>
        )}
        {typeof details.chunkCount === 'number' && (
          <div>
            <p className="text-xs font-medium text-muted mb-1">Chunks Retrieved</p>
            <Badge variant={details.chunkCount > 0 ? 'success' : 'warning'}>
              {details.chunkCount} chunk{details.chunkCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>

      {details.sources && details.sources.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted mb-1">Source Documents</p>
          <ul className="space-y-1">
            {details.sources.map((src, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <span className="text-muted shrink-0">{i + 1}.</span>
                <span className="break-all">{src}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {details.retrievalIds && details.retrievalIds.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted mb-1">
            Chunk IDs{' '}
            <span className="normal-case font-normal">
              — click to filter audit log by provenance
            </span>
          </p>
          <div className="flex flex-wrap gap-1">
            {details.retrievalIds.map((id) => (
              <button
                key={id}
                className="text-xs font-mono bg-hover border border-border px-2 py-0.5 rounded hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-colors cursor-pointer"
                onClick={() => onChunkFilter(id)}
                title={`Show all turns influenced by chunk ${id}`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      {outcome === 'failure' && details.error && (
        <div>
          <p className="text-xs font-medium text-destructive mb-1">Error</p>
          <p className="text-xs text-red-400">{details.error}</p>
        </div>
      )}
    </div>
  );
}

export function AuditLog({ entries, onFilter }: AuditLogProps) {
  const [actionFilter, setActionFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [kbIdFilter, setKbIdFilter] = useState('');
  const [chunkIdFilter, setChunkIdFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const applyFilters = (action: string, outcome: string, kbId: string, chunkId: string) => {
    const filters: Record<string, string> = {};
    if (action) filters.action = action;
    if (outcome) filters.outcome = outcome;
    if (kbId) filters.kbId = kbId;
    if (chunkId) filters.chunkId = chunkId;
    onFilter(filters);
  };

  const handleChunkFilter = (chunkId: string) => {
    setChunkIdFilter(chunkId);
    applyFilters(actionFilter, outcomeFilter, kbIdFilter, chunkId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Audit Log</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Filter by action..."
                className="w-44"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  applyFilters(e.target.value, outcomeFilter, kbIdFilter, chunkIdFilter);
                }}
              />
              <Select
                className="w-36"
                value={outcomeFilter}
                onChange={(e) => {
                  setOutcomeFilter(e.target.value);
                  applyFilters(actionFilter, e.target.value, kbIdFilter, chunkIdFilter);
                }}
              >
                <option value="">All outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="pending">Pending</option>
              </Select>
              <Input
                placeholder="KB ID..."
                className="w-36"
                value={kbIdFilter}
                onChange={(e) => {
                  setKbIdFilter(e.target.value);
                  applyFilters(actionFilter, outcomeFilter, e.target.value, chunkIdFilter);
                }}
              />
              <Input
                placeholder="Chunk ID..."
                className="w-40"
                value={chunkIdFilter}
                onChange={(e) => {
                  setChunkIdFilter(e.target.value);
                  applyFilters(actionFilter, outcomeFilter, kbIdFilter, e.target.value);
                }}
              />
            </div>
          </div>

          {chunkIdFilter && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Showing entries where chunk</span>
              <code className="bg-code px-1.5 py-0.5 rounded font-mono">{chunkIdFilter}</code>
              <span>influenced the output</span>
              <button
                className="underline hover:text-foreground"
                onClick={() => {
                  setChunkIdFilter('');
                  applyFilters(actionFilter, outcomeFilter, kbIdFilter, '');
                }}
              >
                clear
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No audit entries found.</p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[180px_1fr_120px_100px_80px] gap-2 px-3 py-2 text-xs font-medium text-muted uppercase tracking-wider">
              <span>Timestamp</span>
              <span>Action</span>
              <span>Persona</span>
              <span>Target</span>
              <span>Outcome</span>
            </div>

            {entries.map((entry) => (
              <div key={entry.id}>
                <div
                  className="grid grid-cols-[180px_1fr_120px_100px_80px] gap-2 rounded-md px-3 py-2 text-sm hover:bg-hover/50 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <span className="text-xs text-muted">{formatDate(entry.timestamp)}</span>
                  <span className="font-medium">{entry.action.replace(/_/g, ' ')}</span>
                  <span className="text-muted truncate">{entry.persona}</span>
                  <span className="text-muted truncate">{entry.target ?? '-'}</span>
                  <Badge
                    variant={
                      entry.outcome === 'success'
                        ? 'success'
                        : entry.outcome === 'failure'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {entry.outcome}
                  </Badge>
                </div>

                {expandedId === entry.id && entry.details && (
                  <div className="ml-3 mb-2 rounded-md bg-code p-3">
                    {entry.action === 'knowledge_retrieved' ? (
                      <RetrievalDetailPanel
                        details={entry.details as RetrievalDetails}
                        outcome={entry.outcome}
                        onChunkFilter={handleChunkFilter}
                      />
                    ) : (
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
