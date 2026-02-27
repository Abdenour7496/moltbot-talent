import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Check, X } from 'lucide-react';
import { formatRelativeTime, riskColor } from '@/lib/utils';

interface Approval {
  id: string;
  action: string;
  description: string;
  risk: string;
  reversible: boolean;
  requestedAt: string;
  status: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface ApprovalQueueProps {
  approvals: Approval[];
  onGrant: (id: string) => void;
  onDeny: (id: string) => void;
  onSelect: (id: string) => void;
}

export function ApprovalQueue({ approvals, onGrant, onDeny, onSelect }: ApprovalQueueProps) {
  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldCheck className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm text-muted">No approvals to show.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((a) => (
        <Card key={a.id} className="cursor-pointer hover:border-accent/50 transition-colors" onClick={() => onSelect(a.id)}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold truncate">
                  {a.action.replace(/_/g, ' ')}
                </h3>
                <Badge className={riskColor(a.risk)}>{a.risk}</Badge>
                {a.reversible && <Badge variant="outline">reversible</Badge>}
              </div>
              <p className="text-xs text-muted truncate">{a.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Requested {formatRelativeTime(a.requestedAt)}
              </p>
            </div>
            {a.status === 'pending' ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"
                  onClick={(e) => { e.stopPropagation(); onGrant(a.id); }}
                >
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                  onClick={(e) => { e.stopPropagation(); onDeny(a.id); }}
                >
                  <X className="h-3 w-3" /> Deny
                </Button>
              </div>
            ) : (
              <Badge variant={a.status === 'granted' ? 'success' : 'destructive'}>
                {a.status}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
