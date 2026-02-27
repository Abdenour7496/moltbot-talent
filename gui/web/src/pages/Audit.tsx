import { useState, useCallback } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { AuditLog } from '@/components/audit/AuditLog';

export function AuditPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data: entries, loading } = useApi(
    () => api.getAuditLog(Object.keys(filters).length > 0 ? filters : undefined),
    [JSON.stringify(filters)],
  );

  const handleFilter = useCallback((f: Record<string, string>) => {
    setFilters(f);
  }, []);

  if (loading) return <p className="text-muted">Loading audit log...</p>;

  return <AuditLog entries={entries ?? []} onFilter={handleFilter} />;
}
