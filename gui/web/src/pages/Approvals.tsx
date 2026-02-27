import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { ApprovalQueue } from '@/components/approvals/ApprovalQueue';
import { ApprovalDetail } from '@/components/approvals/ApprovalDetail';
import { Button } from '@/components/ui/button';

export function ApprovalsPage() {
  const [filter, setFilter] = useState<string>('');
  const { data: approvals, loading, refetch } = useApi(
    () => api.getApprovals(filter || undefined),
    [filter],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleGrant = async (id: string) => {
    await api.grantApproval(id);
    refetch();
    setSelectedId(null);
  };

  const handleDeny = async (id: string) => {
    await api.denyApproval(id);
    refetch();
    setSelectedId(null);
  };

  if (loading) return <p className="text-muted">Loading approvals...</p>;

  const selected = (approvals ?? []).find((a: any) => a.id === selectedId);

  if (selected) {
    return (
      <ApprovalDetail
        approval={selected}
        onBack={() => setSelectedId(null)}
        onGrant={handleGrant}
        onDeny={handleDeny}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['', 'pending', 'granted', 'denied'].map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f || 'All'}
          </Button>
        ))}
      </div>
      <ApprovalQueue
        approvals={approvals ?? []}
        onGrant={handleGrant}
        onDeny={handleDeny}
        onSelect={setSelectedId}
      />
    </div>
  );
}
