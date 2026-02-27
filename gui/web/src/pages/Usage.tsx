import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Coins,
  MessageSquare,
  Cpu,
} from 'lucide-react';

export function UsagePage() {
  const { data, loading } = useApi(() => api.getUsage());

  if (loading || !data) return <p className="text-muted">Loading usage data...</p>;

  const { totals, byModel, records } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-accent/10 p-2"><MessageSquare className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="text-xs text-muted">Total Requests</p>
                <p className="text-2xl font-bold">{totals.requestCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-blue-400/10 p-2"><BarChart3 className="h-5 w-5 text-blue-400" /></div>
              <div>
                <p className="text-xs text-muted">Total Tokens</p>
                <p className="text-2xl font-bold">{totals.totalTokens.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-emerald-400/10 p-2"><Cpu className="h-5 w-5 text-emerald-400" /></div>
              <div>
                <p className="text-xs text-muted">Input / Output</p>
                <p className="text-lg font-bold">{totals.totalInputTokens.toLocaleString()} <span className="text-muted font-normal">/</span> {totals.totalOutputTokens.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-amber-400/10 p-2"><Coins className="h-5 w-5 text-amber-400" /></div>
              <div>
                <p className="text-xs text-muted">Total Cost</p>
                <p className="text-2xl font-bold">${totals.totalCost.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-model breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage by Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byModel).map(([model, stats]: [string, any]) => {
              const pct = totals.totalTokens > 0 ? (stats.tokens / totals.totalTokens) * 100 : 0;
              return (
                <div key={model} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{model}</span>
                      <Badge variant="outline">{stats.count} requests</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{stats.tokens.toLocaleString()} tokens</span>
                      <span>${stats.cost.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-hover">
                    <div
                      className="h-2 rounded-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Model</th>
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2 pr-4">Input</th>
                  <th className="pb-2 pr-4">Output</th>
                  <th className="pb-2 pr-4">Cost</th>
                  <th className="pb-2">Persona</th>
                </tr>
              </thead>
              <tbody>
                {(records as any[]).slice().reverse().slice(0, 25).map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-muted">{new Date(r.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 pr-4 font-medium">{r.model}</td>
                    <td className="py-2 pr-4">{r.provider}</td>
                    <td className="py-2 pr-4">{r.inputTokens.toLocaleString()}</td>
                    <td className="py-2 pr-4">{r.outputTokens.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-amber-400">${r.cost.toFixed(4)}</td>
                    <td className="py-2">{r.personaId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
