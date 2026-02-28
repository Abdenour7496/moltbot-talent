/**
 * IntegrationsPanel
 *
 * Reusable panel for assigning/removing integration connections to
 * a persona or agent. Shows:
 *  • Assigned integrations as cards (name, type, status, remove)
 *  • "Add Integration" picker — grouped by type, searchable, with status filter
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
  Plug,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2,
  XCircle,
  Bell,
  Activity,
  GitBranch,
  Cloud,
  MessageSquare,
  Ticket,
  FolderKanban,
  Puzzle,
  RefreshCw,
  Unplug,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  connected: boolean;
  config: Record<string, string>;
  lastSync?: string;
}

interface IntegrationsPanelProps {
  entityType: 'persona' | 'agent';
  entityId: string;
  entityName: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  itsm: 'ITSM',
  alerting: 'Alerting',
  project: 'Project Mgmt',
  communication: 'Communication',
  monitoring: 'Monitoring',
  'ci-cd': 'CI/CD',
  cloud: 'Cloud',
  custom: 'Custom',
};

const TYPE_ICONS: Record<string, typeof Plug> = {
  itsm: Ticket,
  alerting: Bell,
  project: FolderKanban,
  communication: MessageSquare,
  monitoring: Activity,
  'ci-cd': GitBranch,
  cloud: Cloud,
  custom: Puzzle,
};

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICONS[type] ?? Plug;
  return <Icon className={className ?? 'h-4 w-4'} />;
}

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type;
}

/* ── Component ──────────────────────────────────────────────────── */

export function IntegrationsPanel({ entityType, entityId, entityName }: IntegrationsPanelProps) {
  const [assigned, setAssigned] = useState<Integration[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  const [showPicker, setShowPicker] = useState(false);
  const [allIntegrations, setAllIntegrations] = useState<Integration[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [filterConnected, setFilterConnected] = useState(false);

  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  /* ── Fetch assigned integrations ── */
  const fetchAssigned = useCallback(async () => {
    setLoadingAssigned(true);
    try {
      const list = entityType === 'persona'
        ? await api.getPersonaIntegrations(entityId)
        : await api.getAgentIntegrations(entityId);
      setAssigned(list);
    } catch {
      setAssigned([]);
    } finally {
      setLoadingAssigned(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { fetchAssigned(); }, [fetchAssigned]);

  /* ── Load all integrations when picker opens ── */
  useEffect(() => {
    if (!showPicker) return;
    setLoadingAll(true);
    api.getIntegrations()
      .then(setAllIntegrations)
      .catch(() => setAllIntegrations([]))
      .finally(() => setLoadingAll(false));
  }, [showPicker]);

  /* ── Add ── */
  const handleAdd = async (integrationId: string) => {
    setAdding(integrationId);
    setError('');
    try {
      const integration = entityType === 'persona'
        ? await api.addPersonaIntegration(entityId, integrationId)
        : await api.addAgentIntegration(entityId, integrationId);
      setAssigned((prev) => prev.some((i) => i.id === integrationId) ? prev : [...prev, integration]);
    } catch (e: any) {
      setError(e.message ?? 'Failed to add integration');
    } finally {
      setAdding(null);
    }
  };

  /* ── Remove ── */
  const handleRemove = async (integrationId: string) => {
    setRemoving(integrationId);
    setError('');
    try {
      if (entityType === 'persona') {
        await api.removePersonaIntegration(entityId, integrationId);
      } else {
        await api.removeAgentIntegration(entityId, integrationId);
      }
      setAssigned((prev) => prev.filter((i) => i.id !== integrationId));
    } catch (e: any) {
      setError(e.message ?? 'Failed to remove integration');
    } finally {
      setRemoving(null);
    }
  };

  /* ── Filtered picker list ── */
  const assignedIds = new Set(assigned.map((i) => i.id));
  const filtered = allIntegrations.filter((i) => {
    if (filterConnected && !i.connected) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) &&
        !i.type.toLowerCase().includes(search.toLowerCase()) &&
        !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by type
  const grouped = filtered.reduce<Record<string, Integration[]>>((acc, i) => {
    (acc[i.type] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* ── Assigned integrations ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Connected Integrations</CardTitle>
            {assigned.length > 0 && (
              <Badge variant="outline" className="text-[10px]">{assigned.length}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAssigned} disabled={loadingAssigned} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingAssigned ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowPicker(true); setError(''); }}>
              <Plus className="h-3.5 w-3.5" /> Add Integration
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}

          {loadingAssigned ? (
            <div className="flex items-center gap-2 text-sm text-muted py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : assigned.length === 0 ? (
            <div className="rounded-lg border border-border border-dashed p-6 text-center space-y-2">
              <Unplug className="h-8 w-8 text-muted mx-auto" />
              <p className="text-sm font-medium">No integrations connected</p>
              <p className="text-xs text-muted">
                Connect {entityName} to external platforms — ITSM, monitoring, CI/CD, cloud services, and more.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {assigned.map((integration) => (
                <div
                  key={integration.id}
                  className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="mt-0.5 rounded-md bg-accent/10 p-1.5 shrink-0">
                      <TypeIcon type={integration.type} className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate">{integration.name}</p>
                        <Badge variant="outline" className="text-[9px] shrink-0">{typeLabel(integration.type)}</Badge>
                      </div>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{integration.description}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {integration.connected ? (
                          <span className="flex items-center gap-1 text-[10px] text-green-500">
                            <CheckCircle2 className="h-3 w-3" /> Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-muted">
                            <XCircle className="h-3 w-3" /> Disconnected
                          </span>
                        )}
                        {integration.lastSync && (
                          <span className="text-[10px] text-muted ml-1">
                            · synced {new Date(integration.lastSync).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted hover:text-destructive"
                    onClick={() => handleRemove(integration.id)}
                    disabled={removing === integration.id}
                    title="Remove"
                  >
                    {removing === integration.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <X className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Picker ── */}
      {showPicker && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Integration to {entityName}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setShowPicker(false); setSearch(''); }}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <Input
                  placeholder="Search integrations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  autoFocus
                />
              </div>
              <Button
                variant={filterConnected ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setFilterConnected((v) => !v)}
              >
                <CheckCircle2 className="h-3 w-3" />
                Connected only
              </Button>
            </div>

            {loadingAll ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading integrations…
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted py-2">
                {allIntegrations.length === 0
                  ? 'No integrations configured. Create one on the Integrations page.'
                  : 'No integrations match the current filter.'}
              </p>
            ) : (
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TypeIcon type={type} className="h-3.5 w-3.5 text-muted" />
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                        {typeLabel(type)}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((integration) => {
                        const isAssigned = assignedIds.has(integration.id);
                        const isAdding = adding === integration.id;
                        return (
                          <div
                            key={integration.id}
                            className={`rounded-lg border p-3 flex items-start justify-between gap-2 transition-colors ${
                              isAssigned
                                ? 'border-accent/30 bg-accent/5'
                                : 'border-border bg-card hover:border-accent/20'
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="mt-0.5 rounded-md bg-muted/20 p-1 shrink-0">
                                <TypeIcon type={integration.type} className="h-3 w-3 text-muted" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{integration.name}</p>
                                <p className="text-[10px] text-muted mt-0.5 line-clamp-2">{integration.description}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  {integration.connected ? (
                                    <span className="flex items-center gap-0.5 text-[10px] text-green-500">
                                      <CheckCircle2 className="h-2.5 w-2.5" /> Connected
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-0.5 text-[10px] text-muted">
                                      <XCircle className="h-2.5 w-2.5" /> Disconnected
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isAssigned ? 'outline' : 'default'}
                              className="shrink-0 text-xs h-7 px-2"
                              onClick={() => !isAssigned && handleAdd(integration.id)}
                              disabled={isAssigned || isAdding}
                            >
                              {isAdding
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : isAssigned
                                  ? <CheckCircle2 className="h-3 w-3 text-accent" />
                                  : <Plus className="h-3 w-3" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
