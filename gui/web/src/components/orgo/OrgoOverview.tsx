import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Monitor,
  Plus,
  Trash2,
  FolderOpen,
  Play,
  Square,
  RotateCw,
  Cpu,
  MemoryStick,
  LayoutTemplate,
  Hammer,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Workspace {
  id: string;
  name: string;
  computerIds: string[];
  createdAt: string;
}

interface Computer {
  id: string;
  workspaceId: string;
  name: string;
  status: string;
  ram: number;
  cpu: number;
  gpu?: string;
  templateId?: string;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  status: string;
  commands: string[];
  envVars: Record<string, string>;
  workdir?: string;
  cloneUrl?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface OrgoOverviewProps {
  workspaces: Workspace[];
  computers: Computer[];
  templates: Template[];
  onSelectComputer: (id: string) => void;
  onAddWorkspace: () => void;
  onAddComputer: () => void;
  onDeleteWorkspace: (id: string) => void;
  onDeleteComputer: (id: string) => void;
  onStartComputer: (id: string) => void;
  onStopComputer: (id: string) => void;
  onRestartComputer: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onBuildTemplate: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusBadge = (status: string) => {
  const map: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
    running: 'success',
    booting: 'warning',
    stopped: 'outline',
    error: 'destructive',
    ready: 'success',
    building: 'warning',
    draft: 'outline',
  };
  return map[status] ?? 'outline';
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OrgoOverview({
  workspaces,
  computers,
  templates,
  onSelectComputer,
  onAddWorkspace,
  onAddComputer,
  onDeleteWorkspace,
  onDeleteComputer,
  onStartComputer,
  onStopComputer,
  onRestartComputer,
  onDeleteTemplate,
  onBuildTemplate,
}: OrgoOverviewProps) {
  return (
    <div className="space-y-8">
      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <FolderOpen className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{workspaces.length}</p>
              <p className="text-xs text-muted">Workspaces</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Monitor className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{computers.length}</p>
              <p className="text-xs text-muted">
                Computers&nbsp;
                <span className="text-emerald-400">
                  ({computers.filter((c) => c.status === 'running').length} running)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <LayoutTemplate className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{templates.length}</p>
              <p className="text-xs text-muted">Templates</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Workspaces & Computers ─────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workspaces &amp; Computers</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onAddWorkspace}>
              <Plus className="h-3.5 w-3.5" /> Workspace
            </Button>
            <Button size="sm" onClick={onAddComputer}>
              <Plus className="h-3.5 w-3.5" /> Computer
            </Button>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted mb-3" />
              <p className="text-sm text-muted">No workspaces yet.</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={onAddWorkspace}>
                <Plus className="h-3.5 w-3.5" /> Create your first workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          workspaces.map((ws) => {
            const wsComputers = computers.filter((c) => c.workspaceId === ws.id);
            return (
              <Card key={ws.id}>
                <CardContent className="p-5 space-y-4">
                  {/* workspace header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-accent" />
                      <h3 className="font-semibold">{ws.name}</h3>
                      <span className="text-xs text-muted">
                        · {wsComputers.length} computer{wsComputers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => onDeleteWorkspace(ws.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* computers grid */}
                  {wsComputers.length === 0 ? (
                    <p className="text-xs text-muted pl-6">No computers in this workspace.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pl-6">
                      {wsComputers.map((comp) => (
                        <div
                          key={comp.id}
                          className="rounded-md border border-border p-4 space-y-2 hover:border-accent/40 transition-colors cursor-pointer"
                          onClick={() => onSelectComputer(comp.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4 text-muted" />
                              <span className="text-sm font-medium">{comp.name}</span>
                            </div>
                            <Badge variant={statusBadge(comp.status)}>{comp.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            <span className="flex items-center gap-1">
                              <MemoryStick className="h-3 w-3" /> {comp.ram / 1024}GB
                            </span>
                            <span className="flex items-center gap-1">
                              <Cpu className="h-3 w-3" /> {comp.cpu} vCPU
                            </span>
                          </div>
                          <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                            {comp.status === 'stopped' ? (
                              <Button size="sm" variant="outline" onClick={() => onStartComputer(comp.id)}>
                                <Play className="h-3 w-3" />
                              </Button>
                            ) : comp.status === 'running' ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => onStopComputer(comp.id)}>
                                  <Square className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onRestartComputer(comp.id)}>
                                  <RotateCw className="h-3 w-3" />
                                </Button>
                              </>
                            ) : null}
                            <Button size="sm" variant="destructive" onClick={() => onDeleteComputer(comp.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {/* ── Templates ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Templates</h2>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <LayoutTemplate className="h-10 w-10 text-muted mb-3" />
              <p className="text-sm text-muted">No templates yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{tpl.name}</h3>
                    <Badge variant={statusBadge(tpl.status)}>{tpl.status}</Badge>
                  </div>
                  {tpl.commands.length > 0 && (
                    <div className="text-xs text-muted space-y-0.5">
                      {tpl.commands.slice(0, 3).map((cmd, i) => (
                        <p key={i} className="font-mono truncate">
                          $ {cmd}
                        </p>
                      ))}
                      {tpl.commands.length > 3 && (
                        <p className="text-muted">+{tpl.commands.length - 3} more</p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {tpl.status !== 'building' && (
                      <Button size="sm" variant="outline" onClick={() => onBuildTemplate(tpl.id)}>
                        <Hammer className="h-3 w-3" /> Build
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => onDeleteTemplate(tpl.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
