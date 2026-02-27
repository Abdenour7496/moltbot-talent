/**
 * Orgo Routes — Desktop Infrastructure for AI Agents
 *
 * Provides management of Orgo workspaces, computers (headless cloud VMs),
 * templates (pre-configured environments), and computer actions
 * (mouse, keyboard, screenshots, bash/python execution).
 *
 * @see https://docs.orgo.ai
 */

import { Router } from 'express';
import {
  orgoWorkspaces,
  orgoComputers,
  orgoTemplates,
  orgoActions,
  addAuditEntry,
  nextOrgoWorkspaceId,
  nextOrgoComputerId,
  nextOrgoTemplateId,
  nextOrgoActionId,
  settings,
  type OrgoWorkspace,
  type OrgoComputer,
  type OrgoTemplate,
  type OrgoComputerAction,
  type OrgoComputerStatus,
  type OrgoGpuType,
} from '../state.js';

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────

function recountWorkspaceComputers(workspaceId: string): void {
  const ws = orgoWorkspaces.get(workspaceId);
  if (!ws) return;
  ws.computerCount = Array.from(orgoComputers.values()).filter(
    (c) => c.workspaceId === workspaceId,
  ).length;
}

function orgoConfigured(): boolean {
  return Boolean(settings.orgoApiKey);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKSPACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** GET /  — overview: config status + counts */
router.get('/', (_req, res) => {
  res.json({
    configured: orgoConfigured(),
    baseUrl: settings.orgoBaseUrl,
    workspaces: orgoWorkspaces.size,
    computers: orgoComputers.size,
    templates: orgoTemplates.size,
  });
});

/** GET /workspaces — list all workspaces */
router.get('/workspaces', (_req, res) => {
  res.json(Array.from(orgoWorkspaces.values()));
});

/** POST /workspaces — create workspace */
router.post('/workspaces', (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  // Enforce unique name
  for (const ws of orgoWorkspaces.values()) {
    if (ws.name === name) {
      res.status(400).json({ error: 'Workspace name already exists' });
      return;
    }
  }
  const id = nextOrgoWorkspaceId();
  const workspace: OrgoWorkspace = {
    id,
    name,
    createdAt: new Date(),
    computerCount: 0,
  };
  orgoWorkspaces.set(id, workspace);

  addAuditEntry({
    persona: 'system',
    action: 'orgo_workspace_created',
    target: id,
    outcome: 'success',
    details: { name },
  });

  res.status(201).json(workspace);
});

/** GET /workspaces/:id — get workspace */
router.get('/workspaces/:id', (req, res) => {
  const ws = orgoWorkspaces.get(req.params.id);
  if (!ws) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.json(ws);
});

/** DELETE /workspaces/:id — delete workspace and all its computers */
router.delete('/workspaces/:id', (req, res) => {
  const ws = orgoWorkspaces.get(req.params.id);
  if (!ws) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  // Delete all computers in workspace
  for (const [cId, comp] of orgoComputers) {
    if (comp.workspaceId === ws.id) {
      orgoComputers.delete(cId);
    }
  }
  orgoWorkspaces.delete(ws.id);

  addAuditEntry({
    persona: 'system',
    action: 'orgo_workspace_deleted',
    target: ws.id,
    outcome: 'success',
    details: { name: ws.name },
  });

  res.json({ success: true });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPUTERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** GET /computers — list all computers (optionally filter by workspaceId) */
router.get('/computers', (req, res) => {
  const wsId = req.query.workspaceId as string | undefined;
  let list = Array.from(orgoComputers.values());
  if (wsId) list = list.filter((c) => c.workspaceId === wsId);
  res.json(list);
});

/** POST /computers — create a computer */
router.post('/computers', (req, res) => {
  const { workspaceId, name, ram, cpu, gpu, templateId } = req.body;
  if (!workspaceId || !name) {
    res.status(400).json({ error: 'workspaceId and name are required' });
    return;
  }
  const ws = orgoWorkspaces.get(workspaceId);
  if (!ws) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const id = nextOrgoComputerId();
  const computer: OrgoComputer = {
    id,
    name,
    workspaceId,
    os: 'linux',
    ram: ram ?? 4,
    cpu: cpu ?? 2,
    gpu: (gpu as OrgoGpuType) ?? 'none',
    status: 'starting',
    url: `https://orgo.ai/workspaces/${id}`,
    templateId: templateId ?? undefined,
    createdAt: new Date(),
  };
  orgoComputers.set(id, computer);
  recountWorkspaceComputers(workspaceId);

  // Simulate boot — mark running after 500ms
  setTimeout(() => {
    const c = orgoComputers.get(id);
    if (c && c.status === 'starting') c.status = 'running';
  }, 500);

  addAuditEntry({
    persona: 'system',
    action: 'orgo_computer_created',
    target: id,
    outcome: 'success',
    details: { name, workspaceId, ram: computer.ram, cpu: computer.cpu },
  });

  res.status(201).json(computer);
});

/** GET /computers/:id — get computer details */
router.get('/computers/:id', (req, res) => {
  const comp = orgoComputers.get(req.params.id);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return;
  }
  res.json(comp);
});

/** DELETE /computers/:id — destroy a computer */
router.delete('/computers/:id', (req, res) => {
  const comp = orgoComputers.get(req.params.id);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return;
  }
  orgoComputers.delete(comp.id);
  recountWorkspaceComputers(comp.workspaceId);

  addAuditEntry({
    persona: 'system',
    action: 'orgo_computer_destroyed',
    target: comp.id,
    outcome: 'success',
    details: { name: comp.name },
  });

  res.json({ success: true });
});

/** POST /computers/:id/restart — restart a computer */
router.post('/computers/:id/restart', (req, res) => {
  const comp = orgoComputers.get(req.params.id);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return;
  }
  comp.status = 'stopping';
  setTimeout(() => {
    comp.status = 'starting';
    setTimeout(() => {
      comp.status = 'running';
    }, 500);
  }, 300);

  res.json({ success: true, status: 'restarting' });
});

/** POST /computers/:id/stop — stop a computer */
router.post('/computers/:id/stop', (req, res) => {
  const comp = orgoComputers.get(req.params.id);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return;
  }
  comp.status = 'stopped';
  res.json({ success: true, status: 'stopped' });
});

/** POST /computers/:id/start — start a stopped computer */
router.post('/computers/:id/start', (req, res) => {
  const comp = orgoComputers.get(req.params.id);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return;
  }
  comp.status = 'starting';
  setTimeout(() => {
    comp.status = 'running';
  }, 500);
  res.json({ success: true, status: 'starting' });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPUTER ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function requireRunning(
  req: any,
  res: any,
): OrgoComputer | null {
  const comp = orgoComputers.get(req.params.id);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return null;
  }
  if (comp.status !== 'running') {
    res.status(400).json({ error: `Computer is ${comp.status}, must be running` });
    return null;
  }
  return comp;
}

function recordAction(
  computerId: string,
  action: string,
  params: Record<string, unknown>,
  result: Record<string, unknown>,
): OrgoComputerAction {
  const entry: OrgoComputerAction = {
    id: nextOrgoActionId(),
    computerId,
    action,
    params,
    result,
    timestamp: new Date(),
  };
  orgoActions.push(entry);
  if (orgoActions.length > 500) orgoActions.splice(0, orgoActions.length - 500);
  return entry;
}

/** GET /computers/:id/screenshot — take screenshot */
router.get('/computers/:id/screenshot', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const result = {
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAADklEQVQI12P4z8BQDwAEgAF/QualEwAAAABJRU5ErkJggg==',
  };
  recordAction(comp.id, 'screenshot', {}, result);
  res.json(result);
});

/** POST /computers/:id/click — mouse click */
router.post('/computers/:id/click', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { x, y, button, double: dbl } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number') {
    res.status(400).json({ error: 'x and y coordinates are required' });
    return;
  }
  const params = { x, y, button: button ?? 'left', double: dbl ?? false };
  recordAction(comp.id, 'click', params, { success: true });
  res.json({ success: true });
});

/** POST /computers/:id/drag — mouse drag */
router.post('/computers/:id/drag', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { start_x, start_y, end_x, end_y, button, duration } = req.body;
  if ([start_x, start_y, end_x, end_y].some((v) => typeof v !== 'number')) {
    res.status(400).json({ error: 'start_x, start_y, end_x, end_y are required' });
    return;
  }
  const params = { start_x, start_y, end_x, end_y, button: button ?? 'left', duration: duration ?? 0.5 };
  recordAction(comp.id, 'drag', params, { success: true });
  res.json({ success: true });
});

/** POST /computers/:id/type — type text */
router.post('/computers/:id/type', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }
  recordAction(comp.id, 'type', { text }, { success: true });
  res.json({ success: true });
});

/** POST /computers/:id/key — press key */
router.post('/computers/:id/key', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { key } = req.body;
  if (!key) {
    res.status(400).json({ error: 'key is required' });
    return;
  }
  recordAction(comp.id, 'key', { key }, { success: true });
  res.json({ success: true });
});

/** POST /computers/:id/scroll — scroll */
router.post('/computers/:id/scroll', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { direction, amount } = req.body;
  if (!direction) {
    res.status(400).json({ error: 'direction is required' });
    return;
  }
  recordAction(comp.id, 'scroll', { direction, amount: amount ?? 3 }, { success: true });
  res.json({ success: true });
});

/** POST /computers/:id/wait — wait/pause */
router.post('/computers/:id/wait', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { duration } = req.body;
  recordAction(comp.id, 'wait', { duration: duration ?? 1 }, { success: true });
  res.json({ success: true });
});

/** POST /computers/:id/bash — execute bash */
router.post('/computers/:id/bash', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { command } = req.body;
  if (!command) {
    res.status(400).json({ error: 'command is required' });
    return;
  }
  // Simulated output
  const output = `$ ${command}\n[simulated output — Orgo VM ${comp.name}]`;
  const result = { output, success: true };
  recordAction(comp.id, 'bash', { command }, result);
  res.json(result);
});

/** POST /computers/:id/exec — execute Python */
router.post('/computers/:id/exec', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { code, timeout } = req.body;
  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }
  const output = `[simulated python — Orgo VM ${comp.name}]`;
  const result = { output, success: true };
  recordAction(comp.id, 'exec', { code, timeout: timeout ?? 10 }, result);
  res.json(result);
});

/** POST /computers/:id/prompt — AI agent prompt (high-level) */
router.post('/computers/:id/prompt', (req, res) => {
  const comp = requireRunning(req, res);
  if (!comp) return;
  const { instruction, model, provider, maxIterations } = req.body;
  if (!instruction) {
    res.status(400).json({ error: 'instruction is required' });
    return;
  }
  const result = {
    success: true,
    message: `AI agent processed instruction on computer "${comp.name}": "${instruction}"`,
    model: model ?? settings.defaultModel,
    iterations: 1,
  };
  recordAction(comp.id, 'prompt', { instruction, model, provider, maxIterations }, result);
  res.json(result);
});

/** GET /computers/:id/actions — action history for a computer */
router.get('/computers/:id/actions', (req, res) => {
  const comp = orgoComputers.get(req.params.id);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return;
  }
  const actions = orgoActions.filter((a) => a.computerId === comp.id);
  res.json(actions);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** GET /templates — list all templates */
router.get('/templates', (_req, res) => {
  res.json(Array.from(orgoTemplates.values()));
});

/** POST /templates — create a template */
router.post('/templates', (req, res) => {
  const { name, workspaceId, commands, envVars, workdir, cloneUrl } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const id = nextOrgoTemplateId();
  const template: OrgoTemplate = {
    id,
    name,
    workspaceId: workspaceId ?? undefined,
    commands: commands ?? [],
    envVars: envVars ?? {},
    workdir: workdir ?? undefined,
    cloneUrl: cloneUrl ?? undefined,
    status: 'draft',
    createdAt: new Date(),
  };
  orgoTemplates.set(id, template);

  addAuditEntry({
    persona: 'system',
    action: 'orgo_template_created',
    target: id,
    outcome: 'success',
    details: { name },
  });

  res.status(201).json(template);
});

/** GET /templates/:id — get template */
router.get('/templates/:id', (req, res) => {
  const tpl = orgoTemplates.get(req.params.id);
  if (!tpl) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json(tpl);
});

/** PUT /templates/:id — update template */
router.put('/templates/:id', (req, res) => {
  const tpl = orgoTemplates.get(req.params.id);
  if (!tpl) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  const { name, commands, envVars, workdir, cloneUrl } = req.body;
  if (name) tpl.name = name;
  if (commands) tpl.commands = commands;
  if (envVars) tpl.envVars = { ...tpl.envVars, ...envVars };
  if (workdir !== undefined) tpl.workdir = workdir;
  if (cloneUrl !== undefined) tpl.cloneUrl = cloneUrl;

  res.json(tpl);
});

/** POST /templates/:id/build — build (simulate) */
router.post('/templates/:id/build', (req, res) => {
  const tpl = orgoTemplates.get(req.params.id);
  if (!tpl) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  tpl.status = 'building';
  setTimeout(() => {
    tpl.status = 'ready';
    tpl.builtAt = new Date();
  }, 1000);

  addAuditEntry({
    persona: 'system',
    action: 'orgo_template_built',
    target: tpl.id,
    outcome: 'success',
    details: { name: tpl.name, commandCount: tpl.commands.length },
  });

  res.json({ success: true, status: 'building' });
});

/** DELETE /templates/:id — delete template */
router.delete('/templates/:id', (req, res) => {
  const tpl = orgoTemplates.get(req.params.id);
  if (!tpl) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  orgoTemplates.delete(tpl.id);

  addAuditEntry({
    persona: 'system',
    action: 'orgo_template_deleted',
    target: tpl.id,
    outcome: 'success',
    details: { name: tpl.name },
  });

  res.json({ success: true });
});

export default router;
