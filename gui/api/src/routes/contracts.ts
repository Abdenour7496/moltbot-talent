import { Router } from 'express';
import { agentListings } from '../state.js';
import { prisma, logAudit } from '../db/index.js';

const router = Router();

/** Resolve the calling user's tenantId (async, Prisma-backed) */
async function callerTenantId(req: any): Promise<string | undefined> {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { tenantId: true },
  });
  return u?.tenantId ?? undefined;
}

/** Convert Prisma ContractMessage to wire format (adds timestamp alias) */
function mapMessage(m: {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  createdAt: Date;
}) {
  return { ...m, timestamp: m.createdAt };
}

/** Enrich a contract with agent info from in-memory agentListings */
function enrichWithAgent(contract: any) {
  const agent = agentListings.get(contract.agentId);
  return {
    ...contract,
    agentName: agent?.name ?? 'Unknown',
    agentTitle: agent?.title ?? '',
    messages: (contract.messages ?? []).map(mapMessage),
  };
}

/** Standard contract include for full detail queries */
const CONTRACT_INCLUDE = {
  milestones: { orderBy: { createdAt: 'asc' as const } },
  messages: { orderBy: { createdAt: 'asc' as const } },
};

// ── GET /api/contracts ──────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { tenantId, agentId, status } = req.query;
  const orgTenantId = await callerTenantId(req);

  const where: any = {};
  if (orgTenantId) {
    where.tenantId = orgTenantId;
  } else if (tenantId) {
    where.tenantId = tenantId;
  }
  if (agentId) where.agentId = agentId;
  if (status) where.status = status;

  const list = await prisma.contract.findMany({
    where,
    include: CONTRACT_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  res.json(list.map(enrichWithAgent));
});

// ── GET /api/contracts/:id ──────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: CONTRACT_INCLUDE,
  });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(enrichWithAgent(contract));
});

// ── PUT /api/contracts/:id ──────────────────────────────────────────

router.put('/:id', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const { title, description, estimatedHours } = req.body;
  const updated = await prisma.contract.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(estimatedHours !== undefined && { estimatedHours: Number(estimatedHours) }),
    },
    include: CONTRACT_INCLUDE,
  });

  logAudit({
    persona: 'system',
    action: 'contract_updated',
    outcome: 'success',
    details: { contractId: contract.id, changes: { title, description, estimatedHours } },
  });

  res.json(enrichWithAgent(updated));
});

// ── POST /api/contracts/:id/message ─────────────────────────────────

router.post('/:id/message', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const { content, senderType } = req.body;
  if (!content) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const msg = await prisma.contractMessage.create({
    data: {
      contractId: contract.id,
      senderId: (req as any).userId,
      senderType: (senderType ?? 'client') as any,
      content,
    },
  });

  logAudit({
    persona: 'system',
    action: 'contract_message_added',
    outcome: 'success',
    details: { contractId: contract.id, senderId: (req as any).userId, senderType: senderType ?? 'client' },
  });

  res.status(201).json(mapMessage(msg));
});

// ── POST /api/contracts/:id/complete ────────────────────────────────

router.post('/:id/complete', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (contract.status === 'completed' || contract.status === 'cancelled') {
    res.status(409).json({ error: `Contract is already ${contract.status}` });
    return;
  }

  const { rating, feedback } = req.body;
  const totalCost = contract.actualHours * contract.hourlyRate;

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.contract.update({
      where: { id: contract.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        totalCost,
        ...(rating !== undefined && { rating }),
        ...(feedback !== undefined && { feedback }),
      },
      include: CONTRACT_INCLUDE,
    });

    // Mark all non-completed milestones as completed
    await tx.contractMilestone.updateMany({
      where: { contractId: contract.id, status: { not: 'completed' } },
      data: { status: 'completed', completedAt: new Date() },
    });

    // Add system message
    await tx.contractMessage.create({
      data: {
        contractId: contract.id,
        senderId: 'system',
        senderType: 'system',
        content: `Contract completed${rating ? ` with a ${rating}/5 rating` : ''}. Agent is now available for new contracts.`,
      },
    });

    return c;
  });

  // Update agent listing (still in-memory)
  const agent = agentListings.get(contract.agentId);
  if (agent) {
    agent.availability = 'available';
    agent.currentContractId = undefined;
    agent.completedJobs++;
    if (rating) {
      agent.rating = +((agent.rating * (agent.completedJobs - 1) + rating) / agent.completedJobs).toFixed(1);
    }
  }

  logAudit({
    persona: 'system',
    action: 'contract_completed',
    outcome: 'success',
    details: { contractId: contract.id, agentId: contract.agentId, rating, totalCost },
  });

  // Reload with updated milestones and messages
  const final = await prisma.contract.findUnique({
    where: { id: contract.id },
    include: CONTRACT_INCLUDE,
  });
  res.json(enrichWithAgent(final!));
});

// ── POST /api/contracts/:id/cancel ──────────────────────────────────

router.post('/:id/cancel', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (contract.status === 'completed' || contract.status === 'cancelled') {
    res.status(409).json({ error: `Contract is already ${contract.status}` });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id: contract.id },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    await tx.contractMessage.create({
      data: {
        contractId: contract.id,
        senderId: 'system',
        senderType: 'system',
        content: 'Contract cancelled. Agent has been released.',
      },
    });
  });

  const agent = agentListings.get(contract.agentId);
  if (agent) {
    agent.availability = 'available';
    agent.currentContractId = undefined;
  }

  logAudit({
    persona: 'system',
    action: 'contract_cancelled',
    outcome: 'success',
    details: { contractId: contract.id, agentId: contract.agentId },
  });

  const updated = await prisma.contract.findUnique({
    where: { id: contract.id },
    include: CONTRACT_INCLUDE,
  });
  res.json(enrichWithAgent(updated!));
});

// ── POST /api/contracts/:id/pause ───────────────────────────────────

router.post('/:id/pause', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (contract.status !== 'active') {
    res.status(409).json({ error: 'Can only pause active contracts' });
    return;
  }

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { status: 'paused' },
    include: CONTRACT_INCLUDE,
  });

  const agent = agentListings.get(contract.agentId);
  if (agent) agent.availability = 'busy';

  logAudit({
    persona: 'system',
    action: 'contract_paused',
    outcome: 'success',
    details: { contractId: contract.id, agentId: contract.agentId },
  });

  res.json(enrichWithAgent(updated));
});

// ── POST /api/contracts/:id/resume ──────────────────────────────────

router.post('/:id/resume', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (contract.status !== 'paused') {
    res.status(409).json({ error: 'Can only resume paused contracts' });
    return;
  }

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { status: 'active' },
    include: CONTRACT_INCLUDE,
  });

  const agent = agentListings.get(contract.agentId);
  if (agent) agent.availability = 'hired';

  logAudit({
    persona: 'system',
    action: 'contract_resumed',
    outcome: 'success',
    details: { contractId: contract.id, agentId: contract.agentId },
  });

  res.json(enrichWithAgent(updated));
});

// ── PUT /api/contracts/:id/hours ────────────────────────────────────

router.put('/:id/hours', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const hours = Number(req.body.hours);
  if (req.body.hours === undefined) {
    res.status(400).json({ error: 'hours is required' });
    return;
  }
  if (!Number.isFinite(hours) || hours < 0) {
    res.status(400).json({ error: 'hours must be a non-negative number' });
    return;
  }

  const newActualHours = contract.actualHours + hours;
  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: {
      actualHours: newActualHours,
      totalCost: newActualHours * contract.hourlyRate,
    },
    include: CONTRACT_INCLUDE,
  });

  logAudit({
    persona: 'system',
    action: 'contract_hours_logged',
    outcome: 'success',
    details: { contractId: contract.id, hoursAdded: hours, newActualHours, totalCost: newActualHours * contract.hourlyRate },
  });

  res.json(enrichWithAgent(updated));
});

// ── PUT /api/contracts/:id/milestones/:msId ─────────────────────────

router.put('/:id/milestones/:msId', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const ms = await prisma.contractMilestone.findFirst({
    where: { id: req.params.msId, contractId: req.params.id },
  });
  if (!ms) {
    res.status(404).json({ error: 'Milestone not found' });
    return;
  }

  const { title, description, status, amount } = req.body;
  const updated = await prisma.contractMilestone.update({
    where: { id: ms.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(amount !== undefined && { amount }),
      ...(status !== undefined && {
        status,
        ...(status === 'completed' && { completedAt: new Date() }),
      }),
    },
  });

  logAudit({
    persona: 'system',
    action: 'contract_milestone_updated',
    outcome: 'success',
    details: { contractId: contract.id, milestoneId: ms.id, changes: { title, description, status, amount } },
  });

  res.json(updated);
});

// ── POST /api/contracts/:id/milestones ──────────────────────────────

router.post('/:id/milestones', async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && contract.tenantId !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const { title, description, dueDate, amount } = req.body;
  const ms = await prisma.contractMilestone.create({
    data: {
      contractId: contract.id,
      title: title ?? 'New milestone',
      description: description ?? '',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'pending',
      amount: amount ?? 0,
    },
  });

  logAudit({
    persona: 'system',
    action: 'contract_milestone_created',
    outcome: 'success',
    details: { contractId: contract.id, milestoneId: ms.id, title: ms.title },
  });

  res.status(201).json(ms);
});

export default router;
