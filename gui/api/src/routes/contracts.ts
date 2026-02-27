import { Router } from 'express';
import {
  contracts,
  agentListings,
  users,
  nextContractMsgId,
  nextMilestoneId,
  addAuditEntry,
} from '../state.js';

const router = Router();

/** Resolve the calling user's tenantId (undefined for admins without a tenant) */
function callerTenantId(req: any): string | undefined {
  const user = users.get(req.userId);
  return user?.tenantId;
}

// ── GET /api/contracts ──────────────────────────────────────────────

router.get('/', (req, res) => {
  const { tenantId, agentId, status } = req.query;
  const orgTenantId = callerTenantId(req);
  let list = [...contracts.values()];

  // Org users can only see their own org's contracts
  if (orgTenantId) {
    list = list.filter((c) => c.tenantId === orgTenantId);
  } else if (tenantId) {
    list = list.filter((c) => c.tenantId === tenantId);
  }

  if (agentId) list = list.filter((c) => c.agentId === agentId);
  if (status) list = list.filter((c) => c.status === status);
  list.sort((a, b) => +b.createdAt - +a.createdAt);

  // Enrich with agent name
  const enriched = list.map((c) => {
    const agent = agentListings.get(c.agentId);
    return { ...c, agentName: agent?.name ?? 'Unknown', agentTitle: agent?.title ?? '' };
  });

  res.json(enriched);
});

// ── GET /api/contracts/:id ──────────────────────────────────────────

router.get('/:id', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  // Org users can only view their own org's contracts
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  const agent = agentListings.get(contract.agentId);
  res.json({ ...contract, agentName: agent?.name ?? 'Unknown', agentTitle: agent?.title ?? '' });
});

// ── PUT /api/contracts/:id ──────────────────────────────────────────

router.put('/:id', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  const { title, description, estimatedHours } = req.body;
  if (title !== undefined) contract.title = title;
  if (description !== undefined) contract.description = description;
  if (estimatedHours !== undefined) contract.estimatedHours = estimatedHours;
  res.json(contract);
});

// ── POST /api/contracts/:id/message ─────────────────────────────────

router.post('/:id/message', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const { content, senderType } = req.body;
  if (!content) { res.status(400).json({ error: 'content is required' }); return; }

  const msg = {
    id: nextContractMsgId(),
    senderId: (req as any).userId,
    senderType: senderType ?? 'client',
    content,
    timestamp: new Date(),
  };
  contract.messages.push(msg);
  res.status(201).json(msg);
});

// ── POST /api/contracts/:id/complete ────────────────────────────────
// Mark work as complete — release the agent

router.post('/:id/complete', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  if (contract.status === 'completed' || contract.status === 'cancelled') {
    res.status(409).json({ error: `Contract is already ${contract.status}` });
    return;
  }

  const { rating, feedback } = req.body;

  contract.status = 'completed';
  contract.completedAt = new Date();
  if (rating !== undefined) contract.rating = rating;
  if (feedback !== undefined) contract.feedback = feedback;

  // Finalize cost
  contract.totalCost = contract.actualHours * contract.hourlyRate;

  // Mark all pending milestones as completed
  for (const ms of contract.milestones) {
    if (ms.status !== 'completed') {
      ms.status = 'completed';
      ms.completedAt = new Date();
    }
  }

  // Release the agent
  const agent = agentListings.get(contract.agentId);
  if (agent) {
    agent.availability = 'available';
    agent.currentContractId = undefined;
    agent.completedJobs++;
    if (rating) {
      // Running average
      agent.rating = +((agent.rating * (agent.completedJobs - 1) + rating) / agent.completedJobs).toFixed(1);
    }
  }

  contract.messages.push({
    id: nextContractMsgId(),
    senderId: 'system',
    senderType: 'system',
    content: `Contract completed${rating ? ` with a ${rating}/5 rating` : ''}. ${agent?.name ?? 'Agent'} is now available for new contracts.`,
    timestamp: new Date(),
  });

  addAuditEntry({
    persona: 'system',
    action: 'contract_completed',
    outcome: 'success',
    details: {
      contractId: contract.id,
      agentId: contract.agentId,
      rating,
      totalCost: contract.totalCost,
    },
  });

  res.json(contract);
});

// ── POST /api/contracts/:id/cancel ──────────────────────────────────

router.post('/:id/cancel', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  if (contract.status === 'completed' || contract.status === 'cancelled') {
    res.status(409).json({ error: `Contract is already ${contract.status}` });
    return;
  }

  contract.status = 'cancelled';
  contract.completedAt = new Date();

  // Release the agent
  const agent = agentListings.get(contract.agentId);
  if (agent) {
    agent.availability = 'available';
    agent.currentContractId = undefined;
  }

  contract.messages.push({
    id: nextContractMsgId(),
    senderId: 'system',
    senderType: 'system',
    content: 'Contract cancelled. Agent has been released.',
    timestamp: new Date(),
  });

  addAuditEntry({
    persona: 'system',
    action: 'contract_cancelled',
    outcome: 'success',
    details: { contractId: contract.id, agentId: contract.agentId },
  });

  res.json(contract);
});

// ── POST /api/contracts/:id/pause ───────────────────────────────────

router.post('/:id/pause', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  if (contract.status !== 'active') {
    res.status(409).json({ error: 'Can only pause active contracts' });
    return;
  }
  contract.status = 'paused';
  const agent = agentListings.get(contract.agentId);
  if (agent) agent.availability = 'busy';
  res.json(contract);
});

// ── POST /api/contracts/:id/resume ──────────────────────────────────

router.post('/:id/resume', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  if (contract.status !== 'paused') {
    res.status(409).json({ error: 'Can only resume paused contracts' });
    return;
  }
  contract.status = 'active';
  const agent = agentListings.get(contract.agentId);
  if (agent) agent.availability = 'hired';
  res.json(contract);
});

// ── PUT /api/contracts/:id/hours ────────────────────────────────────
// Log hours worked

router.put('/:id/hours', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  const { hours } = req.body;
  if (hours === undefined) { res.status(400).json({ error: 'hours is required' }); return; }
  contract.actualHours += Number(hours);
  contract.totalCost = contract.actualHours * contract.hourlyRate;
  res.json(contract);
});

// ── PUT /api/contracts/:id/milestones/:msId ─────────────────────────

router.put('/:id/milestones/:msId', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  const ms = contract.milestones.find((m) => m.id === req.params.msId);
  if (!ms) { res.status(404).json({ error: 'Milestone not found' }); return; }

  const { title, description, status, amount } = req.body;
  if (title !== undefined) ms.title = title;
  if (description !== undefined) ms.description = description;
  if (amount !== undefined) ms.amount = amount;
  if (status !== undefined) {
    ms.status = status;
    if (status === 'completed') ms.completedAt = new Date();
  }
  res.json(ms);
});

// ── POST /api/contracts/:id/milestones ──────────────────────────────

router.post('/:id/milestones', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const { title, description, dueDate, amount } = req.body;
  const ms = {
    id: nextMilestoneId(),
    title: title ?? 'New milestone',
    description: description ?? '',
    dueDate: dueDate ? new Date(dueDate) : undefined,
    status: 'pending' as const,
    amount: amount ?? 0,
  };
  contract.milestones.push(ms);
  res.status(201).json(ms);
});

export default router;
