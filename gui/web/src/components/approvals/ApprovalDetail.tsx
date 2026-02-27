import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X } from 'lucide-react';
import { formatDate, riskColor } from '@/lib/utils';

interface ApprovalDetailProps {
  approval: {
    id: string;
    action: string;
    description: string;
    risk: string;
    reversible: boolean;
    context: Record<string, unknown>;
    requestedAt: string;
    status: string;
    resolvedBy?: string;
    resolvedAt?: string;
  };
  onBack: () => void;
  onGrant: (id: string) => void;
  onDeny: (id: string) => void;
}

export function ApprovalDetail({ approval, onBack, onGrant, onDeny }: ApprovalDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">{approval.action.replace(/_/g, ' ')}</h2>
        <Badge className={riskColor(approval.risk)}>{approval.risk} risk</Badge>
        <Badge variant={approval.status === 'granted' ? 'success' : approval.status === 'denied' ? 'destructive' : 'warning'}>
          {approval.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-xs text-muted">Description</span>
            <p className="text-sm mt-1">{approval.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted">Reversible</span>
              <p className="text-sm mt-1">{approval.reversible ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Requested At</span>
              <p className="text-sm mt-1">{formatDate(approval.requestedAt)}</p>
            </div>
            {approval.resolvedBy && (
              <>
                <div>
                  <span className="text-xs text-muted">Resolved By</span>
                  <p className="text-sm mt-1">{approval.resolvedBy}</p>
                </div>
                <div>
                  <span className="text-xs text-muted">Resolved At</span>
                  <p className="text-sm mt-1">{approval.resolvedAt ? formatDate(approval.resolvedAt) : '-'}</p>
                </div>
              </>
            )}
          </div>
          {Object.keys(approval.context).length > 0 && (
            <div>
              <span className="text-xs text-muted">Context</span>
              <pre className="mt-1 rounded-md bg-code p-3 text-xs overflow-auto">
                {JSON.stringify(approval.context, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {approval.status === 'pending' && (
        <div className="flex gap-3">
          <Button onClick={() => onGrant(approval.id)} className="bg-emerald-600 hover:bg-emerald-700">
            <Check className="h-4 w-4" /> Approve
          </Button>
          <Button variant="destructive" onClick={() => onDeny(approval.id)}>
            <X className="h-4 w-4" /> Deny
          </Button>
        </div>
      )}
    </div>
  );
}
