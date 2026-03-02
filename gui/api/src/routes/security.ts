import { Router } from 'express';
import { securityConfig } from '../state.js';
import { logAudit, setPairingCode, getPairingCode, updatePairingCode, listPairingCodes } from '../db/index.js';
import { randomUUID, randomBytes } from 'crypto';

const router = Router();

// Get security config
router.get('/', (_req, res) => {
  res.json(securityConfig);
});

// Update security config
router.put('/', (req, res) => {
  const { dmPolicy, channelAllowlists, sandboxMode, authMode, authPassword, authToken } = req.body;
  if (dmPolicy !== undefined) securityConfig.dmPolicy = dmPolicy;
  if (channelAllowlists !== undefined) securityConfig.channelAllowlists = channelAllowlists;
  if (sandboxMode !== undefined) securityConfig.sandboxMode = sandboxMode;
  if (authMode !== undefined) securityConfig.authMode = authMode;
  if (authPassword !== undefined) securityConfig.authPassword = authPassword;
  if (authToken !== undefined) securityConfig.authToken = authToken;
  logAudit({
    persona: 'system',
    action: 'security_config_updated',
    outcome: 'success',
    details: { updatedKeys: Object.keys(req.body).filter(k => ['dmPolicy','channelAllowlists','sandboxMode','authMode','authPassword','authToken'].includes(k)) },
  });
  res.json(securityConfig);
});

// List pairing codes
router.get('/pairing', async (_req, res) => {
  const codes = await listPairingCodes();
  res.json(codes);
});

// Generate pairing code
router.post('/pairing', async (req, res) => {
  const { channel, description } = req.body;
  if (!channel) {
    res.status(400).json({ error: 'channel is required' });
    return;
  }

  const code = randomBytes(3).toString('hex').toUpperCase();
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60_000); // 10 min expiry

  const pairing = {
    id,
    channel,
    code,
    description: description ?? '',
    status: 'pending' as const,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await setPairingCode(id, pairing, 600);

  logAudit({
    persona: 'system',
    action: 'pairing_code_generated',
    target: id,
    outcome: 'success',
    details: { channel, code },
  });

  res.status(201).json(pairing);
});

// Approve pairing
router.post('/pairing/:id/approve', async (req, res) => {
  const pairing = await getPairingCode(req.params.id);
  if (!pairing) {
    res.status(404).json({ error: 'Pairing code not found' });
    return;
  }

  const updated = await updatePairingCode(req.params.id, { status: 'approved' });

  // Add to channel allowlist (in-memory security config)
  const channelKey = pairing.channel;
  if (!securityConfig.channelAllowlists[channelKey]) {
    securityConfig.channelAllowlists[channelKey] = [];
  }

  logAudit({
    persona: 'system',
    action: 'pairing_approved',
    target: req.params.id,
    outcome: 'success',
    details: { channel: channelKey, code: pairing.code },
  });

  res.json(updated);
});

// Deny pairing
router.post('/pairing/:id/deny', async (req, res) => {
  const pairing = await getPairingCode(req.params.id);
  if (!pairing) {
    res.status(404).json({ error: 'Pairing code not found' });
    return;
  }

  const updated = await updatePairingCode(req.params.id, { status: 'denied' });
  res.json(updated);
});

// Get channel allowlists
router.get('/allowlists', (_req, res) => {
  res.json(securityConfig.channelAllowlists);
});

// Update allowlist for a channel
router.put('/allowlists/:channel', (req, res) => {
  const { allowFrom } = req.body;
  securityConfig.channelAllowlists[req.params.channel] = allowFrom ?? [];
  res.json({
    channel: req.params.channel,
    allowFrom: securityConfig.channelAllowlists[req.params.channel],
  });
});

export default router;
