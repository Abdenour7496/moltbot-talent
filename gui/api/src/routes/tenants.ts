import { Router } from 'express';
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

const PLAN_LIMITS: Record<string, number> = {
  free: 1, starter: 3, pro: 10, enterprise: 50,
};
const PLAN_BALANCES: Record<string, number> = {
  free: 100, starter: 500, pro: 2000, enterprise: 10000,
};

// ── GET /api/tenants ────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const orgTenantId = await callerTenantId(req);

  const tenants = await prisma.tenant.findMany({
    where: orgTenantId ? { id: orgTenantId } : undefined,
    include: {
      _count: {
        select: {
          members: true,
          contracts: { where: { status: 'active' } },
        },
      },
    },
  });

  const list = tenants.map((t) => ({
    ...t,
    memberCount: t._count.members,
    activeContracts: t._count.contracts,
    _count: undefined,
  }));

  res.json(list);
});

// ── GET /api/tenants/:id ────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        select: {
          id: true, username: true, email: true, displayName: true,
          role: true, avatar: true, active: true, tenantId: true,
          lastLoginAt: true, createdAt: true, updatedAt: true,
        },
      },
      contracts: true,
    },
  });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && tenant.id !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(tenant);
});

// ── POST /api/tenants ───────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { name, industry, plan, contactEmail } = req.body;
  if (!name || !contactEmail) {
    res.status(400).json({ error: 'name and contactEmail are required' });
    return;
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    res.status(409).json({ error: 'An organization with a similar name already exists' });
    return;
  }

  const p = plan ?? 'free';
  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      industry: industry ?? '',
      plan: p,
      contactEmail,
      ownerId: (req as any).userId,
      maxActiveContracts: PLAN_LIMITS[p] ?? 1,
      balance: PLAN_BALANCES[p] ?? 100,
      active: true,
    },
  });

  // Link the creator to this tenant
  await prisma.user.update({
    where: { id: (req as any).userId },
    data: { tenantId: tenant.id },
  });

  logAudit({
    persona: 'system',
    action: 'tenant_created',
    outcome: 'success',
    details: { tenantId: tenant.id, name, plan: p },
  });

  res.status(201).json(tenant);
});

// ── PUT /api/tenants/:id ────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && tenant.id !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const { name, industry, plan, contactEmail, active, balance } = req.body;
  const updated = await prisma.tenant.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(industry !== undefined && { industry }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(active !== undefined && { active }),
      ...(balance !== undefined && { balance }),
      ...(plan !== undefined && {
        plan,
        maxActiveContracts: PLAN_LIMITS[plan] ?? 1,
      }),
    },
  });

  logAudit({
    persona: 'system',
    action: 'tenant_updated',
    outcome: 'success',
    details: { tenantId: tenant.id, changes: { name, industry, plan, contactEmail, active, balance }, updatedBy: (req as any).userId },
  });

  res.json(updated);
});

// ── DELETE /api/tenants/:id ─────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  const exists = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!exists) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId) {
    res.status(403).json({ error: 'Only admins can delete organizations' });
    return;
  }

  // Unlink members first (SetNull in schema handles this automatically)
  await prisma.tenant.delete({ where: { id: req.params.id } });

  res.json({ message: 'Tenant deleted' });
});

// ── POST /api/tenants/:id/members ───────────────────────────────────

router.post('/:id/members', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && tenant.id !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const { userId } = req.body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tenantId: tenant.id },
    select: {
      id: true, username: true, email: true, displayName: true,
      role: true, avatar: true, active: true, tenantId: true,
      lastLoginAt: true, createdAt: true, updatedAt: true,
    },
  });
  res.json(updated);
});

// ── DELETE /api/tenants/:id/members/:userId ──────────────────────────

router.delete('/:id/members/:userId', async (req, res) => {
  const orgTenantId = await callerTenantId(req);
  if (orgTenantId && req.params.id !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { id: req.params.userId, tenantId: req.params.id },
    select: { id: true },
  });
  if (!user) {
    res.status(404).json({ error: 'Member not found in this tenant' });
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { tenantId: null } });
  res.json({ message: 'Member removed' });
});

export default router;
