import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  FileSignature,
  ExternalLink,
  Clock,
  Bot,
} from 'lucide-react';

interface ContractSummary {
  id: string;
  title: string;
  agentId: string;
  status: string;
  actualHours: number;
  estimatedHours: number;
}

interface ContractsWidgetProps {
  contracts: ContractSummary[];
}

export function ContractsWidget({ contracts }: ContractsWidgetProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FileSignature className="h-4 w-4" /> Active Contracts
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/contracts')}
          className="text-xs gap-1"
        >
          View All <ExternalLink className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <div className="text-center py-4">
            <FileSignature className="h-8 w-8 text-teal-400/30 mx-auto mb-2" />
            <p className="text-xs text-muted">No active contracts</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => navigate('/marketplace')}
            >
              Browse Marketplace
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => {
              const pct =
                c.estimatedHours > 0
                  ? Math.min(
                      100,
                      Math.round((c.actualHours / c.estimatedHours) * 100),
                    )
                  : 0;
              return (
                <div
                  key={c.id}
                  className="rounded-md border border-border p-3 hover:bg-hover cursor-pointer transition-colors"
                  onClick={() => navigate('/contracts')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate flex-1">
                      {c.title}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] flex items-center gap-1"
                    >
                      <Bot className="h-3 w-3" />
                      {c.agentId}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct >= 90
                            ? 'bg-amber-400'
                            : pct >= 50
                              ? 'bg-blue-400'
                              : 'bg-emerald-400',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted flex items-center gap-0.5 shrink-0">
                      <Clock className="h-3 w-3" />
                      {c.actualHours}/{c.estimatedHours}h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
