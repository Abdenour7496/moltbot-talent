import { Router } from 'express';
import { integrations, addAuditEntry, nextIntegrationId } from '../state.js';

const router = Router();

// List integrations
router.get('/', (_req, res) => {
  res.json(Array.from(integrations.values()));
});

// Get single integration
router.get('/:id', (req, res) => {
  const intg = integrations.get(req.params.id);
  if (!intg) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }
  res.json(intg);
});

// Create custom integration
router.post('/', (req, res) => {
  const { name, type, description, config } = req.body;
  if (!name || !type) {
    res.status(400).json({ error: 'name and type are required' });
    return;
  }

  const id = nextIntegrationId();
  const intg = {
    id,
    name,
    type,
    description: description ?? '',
    connected: false,
    config: config ?? {},
  };
  integrations.set(id, intg);

  addAuditEntry({
    persona: 'system',
    action: 'integration_created',
    target: id,
    outcome: 'success',
    details: { name, type },
  });

  res.status(201).json(intg);
});

// Update integration config
router.put('/:id', (req, res) => {
  const intg = integrations.get(req.params.id);
  if (!intg) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }

  const { config, connected } = req.body;
  if (config) intg.config = { ...intg.config, ...config };
  if (typeof connected === 'boolean') intg.connected = connected;
  if (connected) intg.lastSync = new Date();

  addAuditEntry({
    persona: 'system',
    action: 'integration_updated',
    target: intg.id,
    outcome: 'success',
    details: { name: intg.name, connected: intg.connected },
  });

  res.json(intg);
});

// Delete integration
router.delete('/:id', (req, res) => {
  const intg = integrations.get(req.params.id);
  if (!intg) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }

  integrations.delete(req.params.id);

  addAuditEntry({
    persona: 'system',
    action: 'integration_deleted',
    target: intg.id,
    outcome: 'success',
    details: { name: intg.name },
  });

  res.json({ ok: true });
});

export default router;
