/**
 * Organization Portal Routes
 *
 * Provides org-scoped endpoints for organization users to view their
 * dashboard, browse/hire agents, and manage their active contracts & personas.
 */

import { Router, type Router as RouterType } from 'express';
import {
  agentListings,
  personas,
  addAuditEntry,
  type AgentListing,
} from '../state.js';
import { prisma, logAudit } from '../db/index.js';

const router: RouterType = Router();

// ── Middleware: resolve the caller's tenant ──────────────────────────

async function resolveTenant(req: any, res: any) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { tenantId: true },
  });
  if (!user || !user.tenantId) {
    res.status(403).json({ error: 'You are not a member of any organization. Create or join one first.' });
    return null;
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) {
    res.status(404).json({ error: 'Organization not found' });
    return null;
  }
  if (!tenant.active) {
    res.status(403).json({ error: 'Your organization has been deactivated' });
    return null;
  }
  return tenant;
}

// ── GET /api/org/portal ─────────────────────────────────────────────

router.get('/portal', async (req, res) => {
  const tenant = await resolveTenant(req, res);
  if (!tenant) return;

  const [orgContracts, members] = await Promise.all([
    prisma.contract.findMany({ where: { tenantId: tenant.id } }),
    prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true, username: true, email: true, displayName: true,
        role: true, avatar: true, active: true, tenantId: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
      },
    }),
  ]);

  const hiredAgentIds = orgContracts
    .filter((c) => c.status === 'active' || c.status === 'paused')
    .map((c) => c.agentId);
  const hiredAgents = hiredAgentIds
    .map((id) => agentListings.get(id))
    .filter(Boolean) as AgentListing[];

  const stats = {
    totalContracts: orgContracts.length,
    activeContracts: orgContracts.filter((c) => c.status === 'active').length,
    completedContracts: orgContracts.filter((c) => c.status === 'completed').length,
    totalSpend: orgContracts.reduce((s, c) => s + c.totalCost, 0),
    hiredAgents: hiredAgents.length,
    memberCount: members.length,
    balance: tenant.balance,
    plan: tenant.plan,
    maxActiveContracts: tenant.maxActiveContracts,
  };

  const recentContracts = [...orgContracts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((c) => {
      const agent = agentListings.get(c.agentId);
      return { ...c, agentName: agent?.name ?? c.agentId };
    });

  res.json({ tenant, stats, members, hiredAgents, recentContracts });
});

// ── GET /api/org/agents ─────────────────────────────────────────────

router.get('/agents', async (req, res) => {
  const tenant = await resolveTenant(req, res);
  if (!tenant) return;

  const orgContracts = await prisma.contract.findMany({
    where: { tenantId: tenant.id },
    include: { milestones: true },
  });

  const result = orgContracts.map((c) => {
    const agent = agentListings.get(c.agentId);
    return {
      contractId: c.id,
      agentId: c.agentId,
      agentName: agent?.name ?? c.agentId,
      agentTitle: agent?.title ?? '',
      agentSpecialty: agent?.specialty ?? c.specialty,
      agentRating: agent?.rating ?? 0,
      agentAvailability: agent?.availability ?? 'unknown',
      contractTitle: c.title,
      contractStatus: c.status,
      hourlyRate: c.hourlyRate,
      estimatedHours: c.estimatedHours,
      actualHours: c.actualHours,
      totalCost: c.totalCost,
      milestonesTotal: c.milestones.length,
      milestonesCompleted: c.milestones.filter((m) => m.status === 'completed').length,
      startedAt: c.startedAt,
      createdAt: c.createdAt,
    };
  });

  res.json(result);
});

// ── GET /api/org/available-agents ───────────────────────────────────

router.get('/available-agents', async (req, res) => {
  const tenant = await resolveTenant(req, res);
  if (!tenant) return;

  const { specialty, search } = req.query;
  let agents = [...agentListings.values()].filter((a) => a.availability === 'available');

  if (specialty) agents = agents.filter((a) => a.specialty === specialty);
  if (search) {
    const q = String(search).toLowerCase();
    agents = agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.includes(q)),
    );
  }

  agents.sort((a, b) => b.rating - a.rating);
  res.json(agents);
});

// ── POST /api/org/hire/:agentId ─────────────────────────────────────

router.post('/hire/:agentId', async (req, res) => {
  const tenant = await resolveTenant(req, res);
  if (!tenant) return;

  const agent = agentListings.get(req.params.agentId);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  if (agent.availability !== 'available') {
    res.status(409).json({ error: `Agent is currently ${agent.availability}` });
    return;
  }

  // Check plan limit
  const activeCount = await prisma.contract.count({
    where: { tenantId: tenant.id, status: { in: ['active', 'paused'] } },
  });
  if (activeCount >= tenant.maxActiveContracts) {
    res.status(403).json({
      error: `Your ${tenant.plan} plan allows a maximum of ${tenant.maxActiveContracts} active contracts. Upgrade your plan or complete existing contracts.`,
    });
    return;
  }

  const { title, description, estimatedHours, milestones: milestonesRaw } = req.body;
  if (!title || !estimatedHours) {
    res.status(400).json({ error: 'title and estimatedHours are required' });
    return;
  }

  const contract = await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      agentId: agent.id,
      clientUserId: (req as any).userId,
      title,
      description: description ?? '',
      specialty: agent.specialty,
      status: 'active',
      hourlyRate: agent.hourlyRate,
      estimatedHours: Number(estimatedHours),
      actualHours: 0,
      totalCost: 0,
      startedAt: new Date(),
      milestones: {
        create: (milestonesRaw ?? []).map((m: any) => ({
          title: m.title ?? 'Milestone',
          description: m.description ?? '',
          dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
          status: 'pending',
          amount: m.amount ?? 0,
        })),
      },
      messages: {
        create: [{
          senderId: 'system',
          senderType: 'system',
          content: `Contract created. ${agent.name} has been hired by ${tenant.name} for "${title}".`,
        }],
      },
    },
    include: { milestones: true, messages: true },
  });

  agent.availability = 'hired';
  agent.currentContractId = contract.id;

  logAudit({
    persona: 'system',
    action: 'org_agent_hired',
    outcome: 'success',
    details: {
      contractId: contract.id,
      agentId: agent.id,
      agentName: agent.name,
      tenantId: tenant.id,
      tenantName: tenant.name,
      title,
    },
  });

  res.status(201).json({ ...contract, agentName: agent.name });
});

// ── GET /api/org/personas ───────────────────────────────────────────

router.get('/personas', async (req, res) => {
  const tenant = await resolveTenant(req, res);
  if (!tenant) return;

  const list = Array.from(personas.values()).map((p) => ({
    id: p.config.id,
    name: p.config.name,
    active: p.active,
    loadedAt: p.loadedAt,
    skills: p.config.skills ?? [],
    integrations: p.config.integrations ?? [],
    hasIdentity: !!p.identity,
    hasSoul: !!p.soul,
    hasExpertise: !!p.expertise,
    hasProcedures: !!p.procedures,
    hasTools: !!p.tools,
  }));

  res.json(list);
});

// ── GET /api/org/contracts ──────────────────────────────────────────

router.get('/contracts', async (req, res) => {
  const tenant = await resolveTenant(req, res);
  if (!tenant) return;

  const { status } = req.query;
  const orgContracts = await prisma.contract.findMany({
    where: { tenantId: tenant.id, ...(status && { status: status as any }) },
    orderBy: { createdAt: 'desc' },
  });

  const result = orgContracts.map((c) => {
    const agent = agentListings.get(c.agentId);
    return { ...c, agentName: agent?.name ?? c.agentId };
  });

  res.json(result);
});

// ── PUT /api/org/profile ────────────────────────────────────────────

router.put('/profile', async (req, res) => {
  const tenant = await resolveTenant(req, res);
  if (!tenant) return;

  const userId: string = (req as any).userId;
  if (tenant.ownerId !== userId) {
    res.status(403).json({ error: 'Only the organization owner can update the profile' });
    return;
  }

  const { name, industry, contactEmail } = req.body;
  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(name !== undefined && { name }),
      ...(industry !== undefined && { industry }),
      ...(contactEmail !== undefined && { contactEmail }),
    },
  });

  logAudit({
    persona: 'system',
    action: 'org_profile_updated',
    outcome: 'success',
    details: { tenantId: tenant.id, changes: { name, industry, contactEmail }, updatedBy: userId },
  });

  res.json(updated);
});

export default router;
