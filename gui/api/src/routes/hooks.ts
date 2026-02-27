import { Router } from 'express';
import {
  hooks,
  nextHookId,
  addAuditEntry,
  type Hook,
} from '../state.js';

const router = Router();

// List all hooks
router.get('/', (_req, res) => {
  const list = Array.from(hooks.values());
  res.json(list);
});

// Create hook
router.post('/', (req, res) => {
  const { name, event, type, config, enabled } = req.body;
  if (!name || !event || !type) {
    res.status(400).json({ error: 'name, event, and type are required' });
    return;
  }

  const hook: Hook = {
    id: nextHookId(),
    name,
    event,
    type,
    config: config ?? {},
    enabled: enabled ?? true,
    triggerCount: 0,
  };
  hooks.set(hook.id, hook);

  addAuditEntry({
    persona: 'system',
    action: 'hook_created',
    target: hook.id,
    outcome: 'success',
    details: { name, event, type },
  });

  res.status(201).json(hook);
});

// Update hook
router.put('/:id', (req, res) => {
  const hook = hooks.get(req.params.id);
  if (!hook) {
    res.status(404).json({ error: 'Hook not found' });
    return;
  }

  const { name, event, type, config, enabled } = req.body;
  if (name !== undefined) hook.name = name;
  if (event !== undefined) hook.event = event;
  if (type !== undefined) hook.type = type;
  if (config !== undefined) hook.config = config;
  if (enabled !== undefined) hook.enabled = enabled;

  res.json(hook);
});

// Delete hook
router.delete('/:id', (req, res) => {
  const hook = hooks.get(req.params.id);
  if (!hook) {
    res.status(404).json({ error: 'Hook not found' });
    return;
  }
  hooks.delete(req.params.id);

  addAuditEntry({
    persona: 'system',
    action: 'hook_deleted',
    target: hook.id,
    outcome: 'success',
  });

  res.json({ ok: true });
});

// Test-trigger a hook
router.post('/:id/test', (req, res) => {
  const hook = hooks.get(req.params.id);
  if (!hook) {
    res.status(404).json({ error: 'Hook not found' });
    return;
  }

  hook.triggerCount++;
  hook.lastTriggeredAt = new Date();

  const result = {
    hookId: hook.id,
    event: hook.event,
    type: hook.type,
    success: hook.enabled,
    message: hook.enabled
      ? `Hook "${hook.name}" test-triggered successfully (${hook.type})`
      : `Hook "${hook.name}" is disabled — trigger skipped`,
    triggeredAt: hook.lastTriggeredAt,
  };

  addAuditEntry({
    persona: 'system',
    action: 'hook_test_triggered',
    target: hook.id,
    outcome: hook.enabled ? 'success' : 'failure',
    details: { hookName: hook.name, event: hook.event },
  });

  res.json(result);
});

export default router;
