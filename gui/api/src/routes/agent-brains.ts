import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  agentListings,
  brainConfigs,
  nextLlmEntryId,
  addAuditEntry,
  type LlmEntry,
} from '../state.js';

const router = Router({ mergeParams: true });

function aid(req: Request): string {
  return req.params.agentId as string;
}

// Middleware: validate agent exists and auto-create brain config if missing
router.use((req: Request, res: Response, next: NextFunction) => {
  const agentId = aid(req);
  if (!agentListings.has(agentId)) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  if (!brainConfigs.has(agentId)) {
    brainConfigs.set(agentId, {
      personaId: agentId,
      routingStrategy: 'priority',
      llms: [],
    });
  }
  next();
});

// Mask API keys for safe output
function maskKey(key?: string): string | undefined {
  if (!key) return undefined;
  if (key.length <= 8) return '***';
  return key.slice(0, 4) + '***' + key.slice(-4);
}

function maskLlm(llm: LlmEntry): LlmEntry {
  return { ...llm, apiKey: maskKey(llm.apiKey) };
}

// GET / — full brain config (keys masked)
router.get('/', (req: Request, res: Response) => {
  const brain = brainConfigs.get(aid(req))!;
  res.json({
    ...brain,
    llms: brain.llms.map(maskLlm),
  });
});

// PUT / — update routing strategy + fallback
router.put('/', (req: Request, res: Response) => {
  const brain = brainConfigs.get(aid(req))!;
  const { routingStrategy, fallbackLlmId } = req.body;
  if (routingStrategy !== undefined) brain.routingStrategy = routingStrategy;
  if (fallbackLlmId !== undefined) brain.fallbackLlmId = fallbackLlmId;

  addAuditEntry({
    persona: aid(req),
    action: 'agent_brain_updated',
    outcome: 'success',
    details: { routingStrategy: brain.routingStrategy, fallbackLlmId: brain.fallbackLlmId },
  });

  res.json({ ...brain, llms: brain.llms.map(maskLlm) });
});

// GET /llms — list LLM entries
router.get('/llms', (req: Request, res: Response) => {
  const brain = brainConfigs.get(aid(req))!;
  res.json(brain.llms.map(maskLlm));
});

// POST /llms — add new LLM entry
router.post('/llms', (req: Request, res: Response) => {
  const brain = brainConfigs.get(aid(req))!;
  const { label, provider, model, endpoint, apiKey, parameters, role, priority, enabled } = req.body;

  if (!label || !provider || !model) {
    res.status(400).json({ error: 'label, provider, and model are required' });
    return;
  }

  const llm: LlmEntry = {
    id: nextLlmEntryId(),
    label,
    provider,
    model,
    endpoint,
    apiKey,
    parameters: parameters ?? { temperature: 0.7, maxTokens: 4096 },
    role: role ?? 'general',
    priority: priority ?? brain.llms.length + 1,
    enabled: enabled ?? true,
    createdAt: new Date(),
  };

  brain.llms.push(llm);

  addAuditEntry({
    persona: aid(req),
    action: 'agent_brain_llm_added',
    target: llm.id,
    outcome: 'success',
    details: { label, provider, model },
  });

  res.status(201).json(maskLlm(llm));
});

// PUT /llms/reorder — bulk-update priority ordering
// NOTE: must be defined BEFORE /llms/:llmId to avoid Express matching 'reorder' as :llmId
router.put('/llms/reorder', (req: Request, res: Response) => {
  const brain = brainConfigs.get(aid(req))!;
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: 'orderedIds array is required' });
    return;
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const llm = brain.llms.find((l) => l.id === orderedIds[i]);
    if (llm) llm.priority = i + 1;
  }

  brain.llms.sort((a, b) => a.priority - b.priority);

  addAuditEntry({
    persona: aid(req),
    action: 'agent_brain_llms_reordered',
    outcome: 'success',
    details: { orderedIds },
  });

  res.json(brain.llms.map(maskLlm));
});

// PUT /llms/:llmId — update LLM entry
router.put('/llms/:llmId', (req: Request, res: Response) => {
  const brain = brainConfigs.get(aid(req))!;
  const llm = brain.llms.find((l) => l.id === req.params.llmId);
  if (!llm) {
    res.status(404).json({ error: 'LLM entry not found' });
    return;
  }

  const { label, provider, model, endpoint, apiKey, parameters, role, priority, enabled } = req.body;
  if (label !== undefined) llm.label = label;
  if (provider !== undefined) llm.provider = provider;
  if (model !== undefined) llm.model = model;
  if (endpoint !== undefined) llm.endpoint = endpoint;
  if (apiKey !== undefined) llm.apiKey = apiKey;
  if (parameters !== undefined) llm.parameters = parameters;
  if (role !== undefined) llm.role = role;
  if (priority !== undefined) llm.priority = priority;
  if (enabled !== undefined) llm.enabled = enabled;

  addAuditEntry({
    persona: aid(req),
    action: 'agent_brain_llm_updated',
    target: llm.id,
    outcome: 'success',
    details: { label: llm.label, provider: llm.provider, model: llm.model },
  });

  res.json(maskLlm(llm));
});

// DELETE /llms/:llmId — remove LLM entry
router.delete('/llms/:llmId', (req: Request, res: Response) => {
  const brain = brainConfigs.get(aid(req))!;
  const idx = brain.llms.findIndex((l) => l.id === req.params.llmId);
  if (idx === -1) {
    res.status(404).json({ error: 'LLM entry not found' });
    return;
  }

  brain.llms.splice(idx, 1);

  addAuditEntry({
    persona: aid(req),
    action: 'agent_brain_llm_removed',
    target: req.params.llmId as string,
    outcome: 'success',
  });

  res.json({ ok: true });
});

// POST /llms/:llmId/test — test connectivity (simulated)
router.post('/llms/:llmId/test', (req: Request, res: Response) => {
  const brain = brainConfigs.get(aid(req))!;
  const llm = brain.llms.find((l) => l.id === req.params.llmId);
  if (!llm) {
    res.status(404).json({ error: 'LLM entry not found' });
    return;
  }

  const success = llm.enabled && !!llm.model;
  res.json({
    llmId: llm.id,
    label: llm.label,
    success,
    latencyMs: success ? Math.floor(Math.random() * 500) + 50 : null,
    message: success
      ? `Connected to ${llm.provider}/${llm.model} successfully`
      : 'Connection failed — LLM is disabled or misconfigured',
    testedAt: new Date(),
  });
});

export default router;
