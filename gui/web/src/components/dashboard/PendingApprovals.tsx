import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { riskColor } from '@/lib/utils';
import {
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useState, useCallback } from 'react';

interface Approval {
  id: string;
  action: string;
  description: string;
  risk: string;
  requestedAt: string;
}

interface PendingApprovalsProps {
  approvals: Approval[];
  onRefresh?: () => void;
}

export function PendingApprovals({ approvals, onRefresh }: PendingApprovalsProps) {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleGrant = useCallback(
    async (id: string) => {
      setProcessing(id);
      try {
        await api.grantApproval(id);
        onRefresh?.();
      } catch {
        /* swallow */
      } finally {
        setProcessing(null);
      }
    },
    [onRefresh],
  );

  const handleDeny = useCallback(
    async (id: string) => {
      setProcessing(id);
      try {
        await api.denyApproval(id, 'Denied from dashboard');
        onRefresh?.();
      } catch {
        /* swallow */
      } finally {
        setProcessing(null);
      }
    },
    [onRefresh],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" /> Pending Approvals
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/approvals')}
          className="text-xs gap-1"
        >
          View All <ExternalLink className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <div className="text-center py-4">
            <ShieldCheck className="h-8 w-8 text-emerald-400/40 mx-auto mb-2" />
            <p className="text-xs text-muted">No pending approvals</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvals.map((a) => (
              <div
                key={a.id}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {a.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {a.description}
                    </p>
                  </div>
                  <Badge
                    variant={
                      a.risk === 'high'
                        ? 'destructive'
                        : a.risk === 'medium'
                          ? 'warning'
                          : 'outline'
                    }
                    className="shrink-0 text-[10px]"
                  >
                    {a.risk}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={processing === a.id}
                    onClick={() => handleGrant(a.id)}
                  >
                    {processing === a.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={processing === a.id}
                    onClick={() => handleDeny(a.id)}
                  >
                    <X className="h-3 w-3 mr-1" /> Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
