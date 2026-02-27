import { Router } from 'express';
import { securityConfig, pairingCodes, addAuditEntry } from '../state.js';
import { randomUUID, randomBytes } from 'crypto';

const router = Router();

// Get security config
router.get('/', (_req, res) => {
  res.json(securityConfig);
});

// Update security config
router.put('/', (req, res) => {
  Object.assign(securityConfig, req.body);
  addAuditEntry({
    persona: 'system',
    action: 'security_config_updated',
    outcome: 'success',
    details: { updatedKeys: Object.keys(req.body) },
  });
  res.json(securityConfig);
});

// List pairing codes
router.get('/pairing', (_req, res) => {
  res.json(Array.from(pairingCodes.values()));
});

// Generate pairing code
router.post('/pairing', (req, res) => {
  const { channel, description } = req.body;
  if (!channel) {
    res.status(400).json({ error: 'channel is required' });
    return;
  }

  const code = randomBytes(3).toString('hex').toUpperCase();
  const pairing = {
    id: randomUUID(),
    channel,
    code,
    description: description ?? '',
    status: 'pending' as const,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60_000), // 10 min expiry
  };
  pairingCodes.set(pairing.id, pairing);

  addAuditEntry({
    persona: 'system',
    action: 'pairing_code_generated',
    target: pairing.id,
    outcome: 'success',
    details: { channel, code },
  });

  res.status(201).json(pairing);
});

// Approve pairing
router.post('/pairing/:id/approve', (req, res) => {
  const pairing = pairingCodes.get(req.params.id);
  if (!pairing) {
    res.status(404).json({ error: 'Pairing code not found' });
    return;
  }

  pairing.status = 'approved';

  // Add to channel allowlist
  const channelKey = pairing.channel;
  if (!securityConfig.channelAllowlists[channelKey]) {
    securityConfig.channelAllowlists[channelKey] = [];
  }

  addAuditEntry({
    persona: 'system',
    action: 'pairing_approved',
    target: pairing.id,
    outcome: 'success',
    details: { channel: channelKey, code: pairing.code },
  });

  res.json(pairing);
});

// Deny pairing
router.post('/pairing/:id/deny', (req, res) => {
  const pairing = pairingCodes.get(req.params.id);
  if (!pairing) {
    res.status(404).json({ error: 'Pairing code not found' });
    return;
  }

  pairing.status = 'denied';
  res.json(pairing);
});

// Get channel allowlists
router.get('/allowlists', (_req, res) => {
  res.json(securityConfig.channelAllowlists);
});

// Update allowlist for a channel
router.put('/allowlists/:channel', (req, res) => {
  const { allowFrom } = req.body;
  securityConfig.channelAllowlists[req.params.channel] = allowFrom ?? [];
  res.json({ channel: req.params.channel, allowFrom: securityConfig.channelAllowlists[req.params.channel] });
});

export default router;
