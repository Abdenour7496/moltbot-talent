import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatDate, outcomeColor } from '@/lib/utils';

interface AuditEntry {
  id: string;
  timestamp: string;
  persona: string;
  action: string;
  target?: string;
  outcome: string;
  details?: Record<string, unknown>;
}

interface AuditLogProps {
  entries: AuditEntry[];
  onFilter: (filters: Record<string, string>) => void;
}

export function AuditLog({ entries, onFilter }: AuditLogProps) {
  const [actionFilter, setActionFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFilter = (action: string, outcome: string) => {
    const filters: Record<string, string> = {};
    if (action) filters.action = action;
    if (outcome) filters.outcome = outcome;
    onFilter(filters);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Audit Log</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Filter by action..."
              className="w-48"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                handleFilter(e.target.value, outcomeFilter);
              }}
            />
            <Select
              className="w-36"
              value={outcomeFilter}
              onChange={(e) => {
                setOutcomeFilter(e.target.value);
                handleFilter(actionFilter, e.target.value);
              }}
            >
              <option value="">All outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="pending">Pending</option>
            </Select>
          </div>
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
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
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
