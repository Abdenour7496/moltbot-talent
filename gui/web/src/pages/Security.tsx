import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Shield,
  Key,
  Users,
  Check,
  X,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export function SecurityPage() {
  const { data: config, loading: configLoading, refetch: refetchConfig } = useApi(() => api.getSecurityConfig());
  const { data: pairings, loading: pairingLoading, refetch: refetchPairings } = useApi(() => api.getPairingCodes());
  const [pairingChannel, setPairingChannel] = useState('');

  const handleUpdateConfig = async (updates: Record<string, unknown>) => {
    await api.updateSecurityConfig(updates);
    refetchConfig();
  };

  const handleGeneratePairing = async () => {
    if (!pairingChannel.trim()) return;
    await api.generatePairingCode({ channel: pairingChannel.trim() });
    setPairingChannel('');
    refetchPairings();
  };

  const handleApprovePairing = async (id: string) => {
    await api.approvePairing(id);
    refetchPairings();
  };

  const handleDenyPairing = async (id: string) => {
    await api.denyPairing(id);
    refetchPairings();
  };

  if (configLoading || pairingLoading) return <p className="text-muted">Loading security settings...</p>;

  const secConfig = config ?? { dmPolicy: 'pairing', channelAllowlists: {}, sandboxMode: 'off', authMode: 'none' };
  const pairingList = pairings ?? [];

  return (
    <div className="space-y-6">
      {/* DM Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> DM Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted">Controls how the assistant handles direct messages from unknown senders.</p>
          <div className="flex gap-2">
            {(['pairing', 'open', 'closed'] as const).map((policy) => (
              <Button
                key={policy}
                size="sm"
                variant={secConfig.dmPolicy === policy ? 'default' : 'outline'}
                onClick={() => handleUpdateConfig({ dmPolicy: policy })}
              >
                {policy === 'pairing' && <Key className="h-3 w-3" />}
                {policy === 'open' && <Users className="h-3 w-3" />}
                {policy === 'closed' && <Shield className="h-3 w-3" />}
                {policy.charAt(0).toUpperCase() + policy.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {secConfig.dmPolicy === 'pairing' && 'Unknown senders must enter a pairing code before the bot processes messages.'}
            {secConfig.dmPolicy === 'open' && 'All senders can interact with the bot. Use allowlists per channel for control.'}
            {secConfig.dmPolicy === 'closed' && 'DMs are disabled. Only channel-specific interactions are allowed.'}
          </p>
        </CardContent>
      </Card>

      {/* Auth Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted">Auth Mode</label>
            <Select value={secConfig.authMode} onChange={(e) => handleUpdateConfig({ authMode: e.target.value })}>
              <option value="none">None</option>
              <option value="password">Password</option>
              <option value="token">Token</option>
            </Select>
          </div>
          {secConfig.authMode === 'password' && (
            <div className="space-y-1">
              <label className="text-xs text-muted">Password</label>
              <Input type="password" value={secConfig.authPassword ?? ''} onChange={(e) => handleUpdateConfig({ authPassword: e.target.value })} placeholder="Set gateway password" />
            </div>
          )}
          {secConfig.authMode === 'token' && (
            <div className="space-y-1">
              <label className="text-xs text-muted">Token</label>
              <Input type="password" value={secConfig.authToken ?? ''} onChange={(e) => handleUpdateConfig({ authToken: e.target.value })} placeholder="Set auth token" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sandbox Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Sandbox Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted">Run non-main sessions in Docker sandboxes to isolate tool execution.</p>
          <div className="flex gap-2">
            {(['off', 'non-main', 'all'] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={secConfig.sandboxMode === mode ? 'default' : 'outline'}
                onClick={() => handleUpdateConfig({ sandboxMode: mode })}
              >
                {mode === 'off' ? 'Off' : mode === 'non-main' ? 'Non-Main Only' : 'All Sessions'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pairing Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> Pairing Codes
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => refetchPairings()}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={pairingChannel}
              onChange={(e) => setPairingChannel(e.target.value)}
              placeholder="Channel (e.g. telegram, slack)"
              className="flex-1"
            />
            <Button size="sm" onClick={handleGeneratePairing} disabled={!pairingChannel.trim()}>
              <Plus className="h-3.5 w-3.5" /> Generate
            </Button>
          </div>
          {pairingList.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">No pairing codes.</p>
          ) : (
            <div className="space-y-2">
              {pairingList.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between border border-border rounded-md p-3">
                  <div>
                    <span className="font-mono text-sm font-bold">{p.code}</span>
                    <span className="text-xs text-muted ml-2">{p.channel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === 'pending' ? 'warning' : p.status === 'approved' ? 'success' : 'destructive'}>
                      {p.status}
                    </Badge>
                    {p.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleApprovePairing(p.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDenyPairing(p.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Allowlists */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Channel Allowlists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted">Per-channel allowlists control who can interact with the assistant. Use "*" to allow all.</p>
          {Object.entries(secConfig.channelAllowlists ?? {}).map(([channel, list]: [string, any]) => (
            <div key={channel} className="space-y-1">
              <label className="text-xs text-muted capitalize">{channel}</label>
              <Input
                value={(list as string[]).join(', ')}
                onChange={(e) => {
                  const newList = e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean);
                  handleUpdateConfig({ channelAllowlists: { ...secConfig.channelAllowlists, [channel]: newList } });
                }}
                placeholder="Comma-separated allowlist (e.g. user@email.com, *)"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
