/**
 * Organization Portal Routes
 *
 * Provides org-scoped endpoints for organization users to view their
 * dashboard, browse/hire agents, and manage their active contracts & personas.
 */

import { Router, type Router as RouterType } from 'express';
import {
  users,
  tenants,
  agentListings,
  contracts,
  personas,
  nextContractId,
  nextMilestoneId,
  addAuditEntry,
  type Contract,
  type AgentListing,
  type Tenant,
} from '../state.js';

const router: RouterType = Router();

// ── Middleware: resolve the caller's tenant ──────────────────────────

function resolveTenant(req: any, res: any): Tenant | null {
  const user = users.get(req.userId);
  if (!user || !user.tenantId) {
    res.status(403).json({ error: 'You are not a member of any organization. Create or join one first.' });
    return null;
  }
  const tenant = tenants.get(user.tenantId);
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
// Dashboard data for the org user

router.get('/portal', (req, res) => {
  const tenant = resolveTenant(req, res);
  if (!tenant) return;

  const orgContracts = [...contracts.values()].filter(
    (c) => c.tenantId === tenant.id,
  );
  const members = [...users.values()]
    .filter((u) => u.tenantId === tenant.id)
    .map(({ passwordHash, ...u }) => u);

  const hiredAgentIds = orgContracts
    .filter((c) => c.status === 'active' || c.status === 'paused')
    .map((c) => c.agentId);
  const hiredAgents = hiredAgentIds
    .map((id) => agentListings.get(id))
    .filter(Boolean);

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

  const recentContracts = orgContracts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((c) => {
      const agent = agentListings.get(c.agentId);
      return { ...c, agentName: agent?.name ?? c.agentId };
    });

  res.json({
    tenant: { ...tenant },
    stats,
    members,
    hiredAgents,
    recentContracts,
  });
});

// ── GET /api/org/agents ─────────────────────────────────────────────
// List agents hired by this org + their contract status

router.get('/agents', (req, res) => {
  const tenant = resolveTenant(req, res);
  if (!tenant) return;

  const orgContracts = [...contracts.values()].filter(
    (c) => c.tenantId === tenant.id,
  );

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
// Browse the marketplace scoped for hiring by org

router.get('/available-agents', (req, res) => {
  const tenant = resolveTenant(req, res);
  if (!tenant) return;

  const { specialty, search } = req.query;
  let agents = [...agentListings.values()].filter(
    (a) => a.availability === 'available',
  );

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
// Hire an agent — automatically scoped to the user's org

router.post('/hire/:agentId', (req, res) => {
  const tenant = resolveTenant(req, res);
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
  const activeCount = [...contracts.values()].filter(
    (c) => c.tenantId === tenant.id && (c.status === 'active' || c.status === 'paused'),
  ).length;
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

  const contractId = nextContractId();
  const milestones = (milestonesRaw ?? []).map((m: any) => ({
    id: nextMilestoneId(),
    title: m.title ?? 'Milestone',
    description: m.description ?? '',
    dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
    status: 'pending' as const,
    amount: m.amount ?? 0,
  }));

  const contract: Contract = {
    id: contractId,
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
    milestones,
    messages: [
      {
        id: `cmsg_${Date.now()}`,
        senderId: 'system',
        senderType: 'system' as const,
        content: `Contract created. ${agent.name} has been hired by ${tenant.name} for "${title}".`,
        timestamp: new Date(),
      },
    ],
    startedAt: new Date(),
    createdAt: new Date(),
  };

  contracts.set(contractId, contract);
  agent.availability = 'hired';
  agent.currentContractId = contractId;

  addAuditEntry({
    persona: 'system',
    action: 'org_agent_hired',
    outcome: 'success',
    details: {
      contractId,
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
// Browse available personas that can be activated for the org

router.get('/personas', (req, res) => {
  const tenant = resolveTenant(req, res);
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
// List all contracts for this org

router.get('/contracts', (req, res) => {
  const tenant = resolveTenant(req, res);
  if (!tenant) return;

  const { status } = req.query;
  let orgContracts = [...contracts.values()].filter(
    (c) => c.tenantId === tenant.id,
  );

  if (status) {
    orgContracts = orgContracts.filter((c) => c.status === status);
  }

  orgContracts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const result = orgContracts.map((c) => {
    const agent = agentListings.get(c.agentId);
    return { ...c, agentName: agent?.name ?? c.agentId };
  });

  res.json(result);
});

// ── PUT /api/org/profile ────────────────────────────────────────────
// Org members can update basic org info (owners only)

router.put('/profile', (req, res) => {
  const tenant = resolveTenant(req, res);
  if (!tenant) return;

  const user = users.get((req as any).userId);
  if (!user || tenant.ownerId !== user.id) {
    res.status(403).json({ error: 'Only the organization owner can update the profile' });
    return;
  }

  const { name, industry, contactEmail } = req.body;
  if (name !== undefined) tenant.name = name;
  if (industry !== undefined) tenant.industry = industry;
  if (contactEmail !== undefined) tenant.contactEmail = contactEmail;

  res.json(tenant);
});

export default router;
