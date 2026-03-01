/**
 * Orgo Routes — Desktop Infrastructure for AI Agents
 *
 * Provides management of Orgo workspaces, computers (headless cloud VMs),
 * templates (pre-configured environments), and computer actions
 * (mouse, keyboard, screenshots, bash/python execution).
 *
 * Every action route is protected by a layered security model:
 *   1. Persona identity  — X-Persona-Id header required
 *   2. Tool whitelist    — persona.config.allowedOrgoTools
 *   3. Risk-based gate   — high-risk (+ strictMode) actions need an approved ApprovalRequest
 *   4. Dry-run mode      — X-Dry-Run: 1 or ?dryRun=true skips side-effects
 *   5. Persistent audit  — every action is written to the audit log
 *
 * @see https://docs.orgo.ai
 */

import { type Request, type Response, Router } from 'express';
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
  personas,
  settings,
  type OrgoWorkspace,
  type OrgoComputer,
  type OrgoTemplate,
  type OrgoComputerAction,
  type OrgoComputerStatus,
  type OrgoGpuType,
} from '../state.js';
import { prisma, logAudit } from '../db/index.js';
import { ACTION_RISK, checkWhitelist, findOrCreateApproval } from '../orgo/guardrails.js';

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

/**
 * Central guard for every computer-action route.
 *
 * Checks (in order):
 *   1. Computer exists + running
 *   2. X-Persona-Id header present
 *   3. Persona whitelist allows the action
 *   4. Risk-based approval gate (high-risk or strict mode)
 *   5. Resolves dry-run flag
 *
 * Returns `{ comp, personaId, dryRun }` on success, or `null` when it has
 * already written an error/202 response.
 */
async function guardAction(
  req: Request,
  res: Response,
  action: string,
): Promise<{ comp: OrgoComputer; personaId: string; dryRun: boolean } | null> {
  // 1. Computer exists + running
  const comp = orgoComputers.get(req.params['id'] as string);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return null;
  }
  if (comp.status !== 'running') {
    res.status(400).json({ error: `Computer is ${comp.status}, must be running` });
    return null;
  }

  // 2. Persona identity
  const personaIdHeader = req.headers['x-persona-id'];
  const personaId = Array.isArray(personaIdHeader) ? personaIdHeader[0] : personaIdHeader;
  if (!personaId) {
    res.status(401).json({ error: 'X-Persona-Id header is required' });
    return null;
  }

  // 3. Whitelist check
  const whitelistError = checkWhitelist(personaId, action);
  if (whitelistError) {
    res.status(403).json({ error: whitelistError });
    return null;
  }

  // 4. Risk-based approval gate
  const risk = ACTION_RISK[action] ?? 'high';
  const needsApproval = risk === 'high' || settings.orgoStrictMode;

  if (needsApproval) {
    const approvalIdHeader = req.headers['x-approval-id'];
    const approvalId = Array.isArray(approvalIdHeader) ? approvalIdHeader[0] : approvalIdHeader;

    if (approvalId) {
      // Caller supplied an existing approval ID
      const approval = await prisma.approvalRequest.findUnique({ where: { id: approvalId } });
      if (!approval) {
        res.status(403).json({ error: 'Approval not found' });
        return null;
      }
      if (approval.status === 'denied') {
        res.status(403).json({ error: 'Approval was denied' });
        return null;
      }
      if (approval.status === 'pending') {
        res.status(202).json({ approvalRequired: true, approvalId: approval.id, status: 'pending' });
        return null;
      }
      // status === 'granted' → fall through
    } else {
      // No approval ID — find or create (idempotent)
      const approval = await findOrCreateApproval(personaId, action, comp.id, req.body ?? {});
      if (approval.status === 'denied') {
        res.status(403).json({ error: 'Approval was denied' });
        return null;
      }
      if (approval.status === 'pending') {
        res.status(202).json({ approvalRequired: true, approvalId: approval.id, status: 'pending' });
        return null;
      }
      // status === 'granted' → fall through
    }
  }

  // 5. Dry-run flag
  const dryRunHeader = req.headers['x-dry-run'];
  const dryRunVal = Array.isArray(dryRunHeader) ? dryRunHeader[0] : dryRunHeader;
  const dryRun = dryRunVal === '1' || req.query.dryRun === 'true';

  return { comp, personaId, dryRun };
}

/**
 * Record an action in the rolling in-memory log AND emit a persistent audit entry.
 */
function recordAction(
  computerId: string,
  action: string,
  params: Record<string, unknown>,
  result: Record<string, unknown>,
  personaId: string,
  dryRun: boolean,
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

  // Persistent audit
  logAudit({
    persona: personaId,
    action: `orgo_${action}`,
    target: computerId,
    outcome: 'success',
    details: { risk: ACTION_RISK[action] ?? 'high', dryRun, actionId: entry.id },
  });

  return entry;
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

/** DELETE /workspaces/:id — delete workspace and all its computers (approval required) */
router.delete('/workspaces/:id', async (req, res) => {
  const ws = orgoWorkspaces.get(req.params.id);
  if (!ws) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const personaIdHeader = req.headers['x-persona-id'];
  const personaId = Array.isArray(personaIdHeader) ? personaIdHeader[0] : personaIdHeader;
  if (!personaId) {
    res.status(401).json({ error: 'X-Persona-Id header is required' });
    return;
  }

  const approval = await findOrCreateApproval(personaId, 'delete_workspace', ws.id, {});
  if (approval.status === 'denied') {
    res.status(403).json({ error: 'Approval was denied' });
    return;
  }
  if (approval.status === 'pending') {
    res.status(202).json({ approvalRequired: true, approvalId: approval.id, status: 'pending' });
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
    persona: personaId,
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

/** DELETE /computers/:id — destroy a computer (approval required) */
router.delete('/computers/:id', async (req, res) => {
  const comp = orgoComputers.get(req.params.id);
  if (!comp) {
    res.status(404).json({ error: 'Computer not found' });
    return;
  }

  const personaIdHeader = req.headers['x-persona-id'];
  const personaId = Array.isArray(personaIdHeader) ? personaIdHeader[0] : personaIdHeader;
  if (!personaId) {
    res.status(401).json({ error: 'X-Persona-Id header is required' });
    return;
  }

  const approval = await findOrCreateApproval(personaId, 'delete_computer', comp.id, {});
  if (approval.status === 'denied') {
    res.status(403).json({ error: 'Approval was denied' });
    return;
  }
  if (approval.status === 'pending') {
    res.status(202).json({ approvalRequired: true, approvalId: approval.id, status: 'pending' });
    return;
  }

  orgoComputers.delete(comp.id);
  recountWorkspaceComputers(comp.workspaceId);

  addAuditEntry({
    persona: personaId,
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

/** GET /computers/:id/screenshot — take screenshot */
router.get('/computers/:id/screenshot', async (req, res) => {
  const guard = await guardAction(req, res, 'screenshot');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const result = {
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAADklEQVQI12P4z8BQDwAEgAF/QualEwAAAABJRU5ErkJggg==',
  };

  if (dryRun) {
    recordAction(comp.id, 'screenshot', {}, { ...result, dryRun: true }, personaId, true);
    res.json({ ...result, dryRun: true });
    return;
  }

  recordAction(comp.id, 'screenshot', {}, result, personaId, false);
  res.json(result);
});

/** POST /computers/:id/click — mouse click */
router.post('/computers/:id/click', async (req, res) => {
  const guard = await guardAction(req, res, 'click');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { x, y, button, double: dbl } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number') {
    res.status(400).json({ error: 'x and y coordinates are required' });
    return;
  }
  const params = { x, y, button: button ?? 'left', double: dbl ?? false };

  if (dryRun) {
    recordAction(comp.id, 'click', params, { success: true, dryRun: true }, personaId, true);
    res.json({ success: true, dryRun: true });
    return;
  }

  recordAction(comp.id, 'click', params, { success: true }, personaId, false);
  res.json({ success: true });
});

/** POST /computers/:id/drag — mouse drag */
router.post('/computers/:id/drag', async (req, res) => {
  const guard = await guardAction(req, res, 'drag');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { start_x, start_y, end_x, end_y, button, duration } = req.body;
  if ([start_x, start_y, end_x, end_y].some((v) => typeof v !== 'number')) {
    res.status(400).json({ error: 'start_x, start_y, end_x, end_y are required' });
    return;
  }
  const params = { start_x, start_y, end_x, end_y, button: button ?? 'left', duration: duration ?? 0.5 };

  if (dryRun) {
    recordAction(comp.id, 'drag', params, { success: true, dryRun: true }, personaId, true);
    res.json({ success: true, dryRun: true });
    return;
  }

  recordAction(comp.id, 'drag', params, { success: true }, personaId, false);
  res.json({ success: true });
});

/** POST /computers/:id/type — type text */
router.post('/computers/:id/type', async (req, res) => {
  const guard = await guardAction(req, res, 'type');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  if (dryRun) {
    recordAction(comp.id, 'type', { text }, { success: true, dryRun: true }, personaId, true);
    res.json({ success: true, dryRun: true });
    return;
  }

  recordAction(comp.id, 'type', { text }, { success: true }, personaId, false);
  res.json({ success: true });
});

/** POST /computers/:id/key — press key */
router.post('/computers/:id/key', async (req, res) => {
  const guard = await guardAction(req, res, 'key');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { key } = req.body;
  if (!key) {
    res.status(400).json({ error: 'key is required' });
    return;
  }

  if (dryRun) {
    recordAction(comp.id, 'key', { key }, { success: true, dryRun: true }, personaId, true);
    res.json({ success: true, dryRun: true });
    return;
  }

  recordAction(comp.id, 'key', { key }, { success: true }, personaId, false);
  res.json({ success: true });
});

/** POST /computers/:id/scroll — scroll */
router.post('/computers/:id/scroll', async (req, res) => {
  const guard = await guardAction(req, res, 'scroll');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { direction, amount } = req.body;
  if (!direction) {
    res.status(400).json({ error: 'direction is required' });
    return;
  }
  const params = { direction, amount: amount ?? 3 };

  if (dryRun) {
    recordAction(comp.id, 'scroll', params, { success: true, dryRun: true }, personaId, true);
    res.json({ success: true, dryRun: true });
    return;
  }

  recordAction(comp.id, 'scroll', params, { success: true }, personaId, false);
  res.json({ success: true });
});

/** POST /computers/:id/wait — wait/pause */
router.post('/computers/:id/wait', async (req, res) => {
  const guard = await guardAction(req, res, 'wait');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { duration } = req.body;
  const params = { duration: duration ?? 1 };

  if (dryRun) {
    recordAction(comp.id, 'wait', params, { success: true, dryRun: true }, personaId, true);
    res.json({ success: true, dryRun: true });
    return;
  }

  recordAction(comp.id, 'wait', params, { success: true }, personaId, false);
  res.json({ success: true });
});

/** POST /computers/:id/bash — execute bash */
router.post('/computers/:id/bash', async (req, res) => {
  const guard = await guardAction(req, res, 'bash');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { command } = req.body;
  if (!command) {
    res.status(400).json({ error: 'command is required' });
    return;
  }

  if (dryRun) {
    recordAction(comp.id, 'bash', { command }, { output: '[dry-run]', success: true, dryRun: true }, personaId, true);
    res.json({ output: '[dry-run]', success: true, dryRun: true });
    return;
  }

  const output = `$ ${command}\n[simulated output — Orgo VM ${comp.name}]`;
  const result = { output, success: true };
  recordAction(comp.id, 'bash', { command }, result, personaId, false);
  res.json(result);
});

/** POST /computers/:id/exec — execute Python */
router.post('/computers/:id/exec', async (req, res) => {
  const guard = await guardAction(req, res, 'exec');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { code, timeout } = req.body;
  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }

  if (dryRun) {
    recordAction(comp.id, 'exec', { code, timeout: timeout ?? 10 }, { output: '[dry-run]', success: true, dryRun: true }, personaId, true);
    res.json({ output: '[dry-run]', success: true, dryRun: true });
    return;
  }

  const output = `[simulated python — Orgo VM ${comp.name}]`;
  const result = { output, success: true };
  recordAction(comp.id, 'exec', { code, timeout: timeout ?? 10 }, result, personaId, false);
  res.json(result);
});

/** POST /computers/:id/prompt — AI agent prompt (high-level) */
router.post('/computers/:id/prompt', async (req, res) => {
  const guard = await guardAction(req, res, 'prompt');
  if (!guard) return;
  const { comp, personaId, dryRun } = guard;

  const { instruction, model, provider, maxIterations } = req.body;
  if (!instruction) {
    res.status(400).json({ error: 'instruction is required' });
    return;
  }

  // Clamp iterations to configured max (hard cap 50)
  const clampedIterations = Math.min(
    maxIterations ?? settings.orgoMaxIterations,
    settings.orgoMaxIterations,
    50,
  );

  if (dryRun) {
    const dryResult = {
      success: true,
      message: `[dry-run] AI agent would process: "${instruction}"`,
      model: model ?? settings.defaultModel,
      iterations: clampedIterations,
      dryRun: true,
    };
    recordAction(comp.id, 'prompt', { instruction, model, provider, maxIterations: clampedIterations }, dryResult, personaId, true);
    res.json(dryResult);
    return;
  }

  const result = {
    success: true,
    message: `AI agent processed instruction on computer "${comp.name}": "${instruction}"`,
    model: model ?? settings.defaultModel,
    iterations: clampedIterations,
  };
  recordAction(comp.id, 'prompt', { instruction, model, provider, maxIterations: clampedIterations }, result, personaId, false);
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POLICY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** GET /policy/actions — return the ACTION_RISK map for UI rendering */
router.get('/policy/actions', (_req, res) => {
  res.json(ACTION_RISK);
});

/** GET /policy — list allowedOrgoTools for every loaded persona */
router.get('/policy', (_req, res) => {
  const policy: Record<string, string[]> = {};
  for (const [id, persona] of personas) {
    policy[id] = persona.config.allowedOrgoTools ?? [];
  }
  res.json(policy);
});

/** PUT /policy/:personaId — update allowedOrgoTools for a persona */
router.put('/policy/:personaId', (req, res) => {
  const persona = personas.get(req.params.personaId);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }
  const { allowedOrgoTools } = req.body;
  if (!Array.isArray(allowedOrgoTools)) {
    res.status(400).json({ error: 'allowedOrgoTools must be an array of strings' });
    return;
  }
  persona.config.allowedOrgoTools = allowedOrgoTools as string[];

  logAudit({
    persona: 'system',
    action: 'orgo_policy_updated',
    target: req.params.personaId,
    outcome: 'success',
    details: { allowedOrgoTools },
  });

  res.json({ personaId: req.params.personaId, allowedOrgoTools: persona.config.allowedOrgoTools });
});

export default router;
