import { Router } from 'express';
import {
  channels,
  nextChannelId,
  addAuditEntry,
  type Channel,
} from '../state.js';

const router = Router();

// List all channels
router.get('/', (_req, res) => {
  const list = Array.from(channels.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  res.json(list);
});

// Create channel
router.post('/', (req, res) => {
  const { name, type, personaId, config } = req.body;
  if (!name || !type || !personaId) {
    res.status(400).json({ error: 'name, type, and personaId are required' });
    return;
  }

  const channel: Channel = {
    id: nextChannelId(),
    name,
    type,
    personaId,
    config: config ?? {},
    active: true,
    createdAt: new Date(),
  };
  channels.set(channel.id, channel);

  addAuditEntry({
    persona: personaId,
    action: 'channel_created',
    target: channel.id,
    outcome: 'success',
    details: { name, type },
  });

  res.status(201).json(channel);
});

// Update channel
router.put('/:id', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }

  const { name, type, personaId, config, active } = req.body;
  if (name !== undefined) channel.name = name;
  if (type !== undefined) channel.type = type;
  if (personaId !== undefined) channel.personaId = personaId;
  if (config !== undefined) channel.config = config;
  if (active !== undefined) channel.active = active;

  res.json(channel);
});

// Delete channel
router.delete('/:id', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }
  channels.delete(req.params.id);

  addAuditEntry({
    persona: channel.personaId,
    action: 'channel_deleted',
    target: channel.id,
    outcome: 'success',
  });

  res.json({ ok: true });
});

// Test channel connectivity
router.post('/:id/test', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }

  // Simulate a connectivity test
  const success = channel.active && Object.keys(channel.config).length > 0;
  res.json({
    channelId: channel.id,
    success,
    message: success
      ? `Successfully connected to ${channel.type} channel "${channel.name}"`
      : `Connection test failed — channel is ${channel.active ? 'missing config' : 'inactive'}`,
    testedAt: new Date(),
  });
});

export default router;
