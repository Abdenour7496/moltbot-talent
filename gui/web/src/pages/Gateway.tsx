import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Radio,
  Users,
  Clock,
  Activity,
  RefreshCcw,
  Wifi,
  WifiOff,
  Server,
  MessageSquare,
} from 'lucide-react';

interface GatewayStatus {
  totalClients: number;
  uptime: number;
  clients: { id: string; clientType: string; connectedAt: string }[];
}

export function GatewayPage() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.getGatewayStatus();
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Probe WS availability
  useEffect(() => {
    try {
      const ws = new WebSocket(`ws://${window.location.hostname}:3001/ws`);
      ws.onopen = () => {
        setWsConnected(true);
        ws.close();
      };
      ws.onerror = () => setWsConnected(false);
    } catch {
      setWsConnected(false);
    }
  }, []);

  const formatUptime = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h ${mins % 60}m`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m ${secs % 60}s`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted">Loading gateway status...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Gateway</h2>
          <Badge variant={wsConnected ? 'success' : 'destructive'}>
            {wsConnected ? 'WebSocket Online' : 'WebSocket Offline'}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            {wsConnected ? <Wifi className="h-8 w-8 text-emerald-400" /> : <WifiOff className="h-8 w-8 text-red-400" />}
            <div>
              <p className="text-sm text-muted">Status</p>
              <p className="text-xl font-bold">{wsConnected ? 'Online' : 'Offline'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-sm text-muted">Connected Clients</p>
              <p className="text-xl font-bold">{status?.totalClients ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-sm text-muted">Uptime</p>
              <p className="text-xl font-bold">{status ? formatUptime(status.uptime) : '—'}</p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Connected Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" /> Connected Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status?.clients && status.clients.length > 0 ? (
            <div className="space-y-2">
              {status.clients.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-input">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-mono">{c.id.slice(0, 12)}...</span>
                  </div>
                  <Badge variant="outline">{c.clientType}</Badge>
                  <span className="text-xs text-muted">{new Date(c.connectedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-4">No clients currently connected.</p>
          )}
        </CardContent>
      </Card>

      {/* WebSocket Info */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Endpoint</span>
            <span className="font-mono">ws://{window.location.hostname}:3001/ws</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Heartbeat Interval</span>
            <span>30s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Protocol</span>
            <span>JSON over WebSocket</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Events</span>
            <span>session.message, presence, typing, broadcast</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
