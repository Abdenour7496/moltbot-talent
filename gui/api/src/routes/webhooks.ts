import { Router } from 'express';
import { webhookEndpoints, nextWebhookId, addAuditEntry } from '../state.js';

const router = Router();

// List webhook endpoints
router.get('/', (_req, res) => {
  res.json(Array.from(webhookEndpoints.values()));
});

// Create webhook endpoint
router.post('/', (req, res) => {
  const { name, path, secret, targetPersonaId, action, enabled } = req.body;
  if (!name || !path) {
    res.status(400).json({ error: 'name and path are required' });
    return;
  }

  const id = nextWebhookId();
  const endpoint = {
    id,
    name,
    path: path.startsWith('/') ? path : `/${path}`,
    secret: secret ?? '',
    targetPersonaId: targetPersonaId ?? '',
    action: action ?? 'message',
    enabled: enabled ?? true,
    createdAt: new Date(),
    lastTriggeredAt: undefined as Date | undefined,
    triggerCount: 0,
  };
  webhookEndpoints.set(id, endpoint);

  addAuditEntry({
    persona: 'system',
    action: 'webhook_created',
    target: id,
    outcome: 'success',
    details: { name, path: endpoint.path },
  });

  res.status(201).json(endpoint);
});

// Update webhook endpoint
router.put('/:id', (req, res) => {
  const wh = webhookEndpoints.get(req.params.id);
  if (!wh) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }

  const { name, path, secret, targetPersonaId, action, enabled } = req.body;
  if (name !== undefined) wh.name = name;
  if (path !== undefined) wh.path = path.startsWith('/') ? path : `/${path}`;
  if (secret !== undefined) wh.secret = secret;
  if (targetPersonaId !== undefined) wh.targetPersonaId = targetPersonaId;
  if (action !== undefined) wh.action = action;
  if (typeof enabled === 'boolean') wh.enabled = enabled;

  res.json(wh);
});

// Delete webhook endpoint
router.delete('/:id', (req, res) => {
  const wh = webhookEndpoints.get(req.params.id);
  if (!wh) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }

  webhookEndpoints.delete(req.params.id);

  addAuditEntry({
    persona: 'system',
    action: 'webhook_deleted',
    target: wh.id,
    outcome: 'success',
    details: { name: wh.name },
  });

  res.json({ ok: true });
});

// Trigger webhook (inbound surface)
router.post('/:id/trigger', (req, res) => {
  const wh = webhookEndpoints.get(req.params.id);
  if (!wh) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }

  if (!wh.enabled) {
    res.status(403).json({ error: 'Webhook is disabled' });
    return;
  }

  // Verify secret if set
  if (wh.secret && req.headers['x-webhook-secret'] !== wh.secret) {
    res.status(401).json({ error: 'Invalid secret' });
    return;
  }

  wh.lastTriggeredAt = new Date();
  wh.triggerCount++;

  addAuditEntry({
    persona: 'system',
    action: 'webhook_triggered',
    target: wh.id,
    outcome: 'success',
    details: { name: wh.name, payload: req.body },
  });

  res.json({ ok: true, triggeredAt: wh.lastTriggeredAt });
});

export default router;
