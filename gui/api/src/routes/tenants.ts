import { Router } from 'express';
import {
  tenants,
  users,
  contracts,
  nextTenantId,
  addAuditEntry,
  type Tenant,
} from '../state.js';

const router = Router();

/** Resolve the calling user's tenantId */
function callerTenantId(req: any): string | undefined {
  const user = users.get(req.userId);
  return user?.tenantId;
}

// ── GET /api/tenants ────────────────────────────────────────────────

router.get('/', (req, res) => {
  const orgTenantId = callerTenantId(req);

  // Org users only see their own org
  let tenantList = [...tenants.values()];
  if (orgTenantId) {
    tenantList = tenantList.filter((t) => t.id === orgTenantId);
  }

  const list = tenantList.map((t) => {
    const memberCount = [...users.values()].filter((u) => u.tenantId === t.id).length;
    const activeContracts = [...contracts.values()].filter(
      (c) => c.tenantId === t.id && c.status === 'active',
    ).length;
    return { ...t, memberCount, activeContracts };
  });
  res.json(list);
});

// ── GET /api/tenants/:id ────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return; }

  // Org users can only view their own tenant
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && tenant.id !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const members = [...users.values()]
    .filter((u) => u.tenantId === tenant.id)
    .map(({ passwordHash, ...u }) => u);

  const tenantContracts = [...contracts.values()].filter(
    (c) => c.tenantId === tenant.id,
  );

  res.json({ ...tenant, members, contracts: tenantContracts });
});

// ── POST /api/tenants ───────────────────────────────────────────────

router.post('/', (req, res) => {
  const { name, industry, plan, contactEmail } = req.body;
  if (!name || !contactEmail) {
    res.status(400).json({ error: 'name and contactEmail are required' });
    return;
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = [...tenants.values()].find((t) => t.slug === slug);
  if (existing) {
    res.status(409).json({ error: 'An organization with a similar name already exists' });
    return;
  }

  const id = nextTenantId();
  const planLimits: Record<string, number> = {
    free: 1, starter: 3, pro: 10, enterprise: 50,
  };
  const planBalances: Record<string, number> = {
    free: 100, starter: 500, pro: 2000, enterprise: 10000,
  };
  const p = plan ?? 'free';

  const tenant: Tenant = {
    id,
    name,
    slug,
    industry: industry ?? '',
    plan: p,
    contactEmail,
    ownerId: (req as any).userId,
    maxActiveContracts: planLimits[p] ?? 1,
    balance: planBalances[p] ?? 100,
    active: true,
    createdAt: new Date(),
  };

  tenants.set(id, tenant);

  // Link the creator to this tenant
  const creator = users.get((req as any).userId);
  if (creator) creator.tenantId = id;

  addAuditEntry({
    persona: 'system',
    action: 'tenant_created',
    outcome: 'success',
    details: { tenantId: id, name, plan: p },
  });

  res.status(201).json(tenant);
});

// ── PUT /api/tenants/:id ────────────────────────────────────────────

router.put('/:id', (req, res) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return; }

  // Org users can only edit their own tenant
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && tenant.id !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const { name, industry, plan, contactEmail, active, balance } = req.body;
  if (name !== undefined) tenant.name = name;
  if (industry !== undefined) tenant.industry = industry;
  if (contactEmail !== undefined) tenant.contactEmail = contactEmail;
  if (active !== undefined) tenant.active = active;
  if (balance !== undefined) tenant.balance = balance;
  if (plan !== undefined) {
    tenant.plan = plan;
    const planLimits: Record<string, number> = {
      free: 1, starter: 3, pro: 10, enterprise: 50,
    };
    tenant.maxActiveContracts = planLimits[plan] ?? 1;
  }

  res.json(tenant);
});

// ── DELETE /api/tenants/:id ─────────────────────────────────────────

router.delete('/:id', (req, res) => {
  if (!tenants.has(req.params.id)) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  // Org users cannot delete tenants
  const orgTenantId = callerTenantId(req);
  if (orgTenantId) {
    res.status(403).json({ error: 'Only admins can delete organizations' });
    return;
  }
  tenants.delete(req.params.id);

  // Unlink users
  for (const u of users.values()) {
    if (u.tenantId === req.params.id) u.tenantId = undefined;
  }

  res.json({ message: 'Tenant deleted' });
});

// ── POST /api/tenants/:id/members ───────────────────────────────────
// Add a user to a tenant

router.post('/:id/members', (req, res) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return; }

  // Org users can only manage members of their own tenant
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && tenant.id !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const { userId } = req.body;
  const user = users.get(userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  user.tenantId = tenant.id;
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// ── DELETE /api/tenants/:id/members/:userId ──────────────────────────

router.delete('/:id/members/:userId', (req, res) => {
  // Org users can only manage members of their own tenant
  const orgTenantId = callerTenantId(req);
  if (orgTenantId && req.params.id !== orgTenantId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  const user = users.get(req.params.userId);
  if (!user || user.tenantId !== req.params.id) {
    res.status(404).json({ error: 'Member not found in this tenant' });
    return;
  }
  user.tenantId = undefined;
  res.json({ message: 'Member removed' });
});

export default router;
