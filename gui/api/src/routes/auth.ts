import { Router } from 'express';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
} from '../auth.js';
import { prisma, logAudit } from '../db/index.js';

const router = Router();

// ── POST /api/auth/login ────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!user.active) {
    res.status(403).json({ error: 'Account is deactivated' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({
    sub: user.id,
    role: user.role,
    username: user.username,
    tenantId: user.tenantId,
  });

  logAudit({
    persona: 'system',
    action: 'user_login',
    outcome: 'success',
    details: { userId: user.id, username: user.username },
  });

  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ── POST /api/auth/register ─────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { username, email, displayName, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  if (username.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    res.status(409).json({ error: 'Username or email already taken' });
    return;
  }

  const { orgName, orgIndustry } = req.body;
  const role = orgName ? ('operator' as const) : ('viewer' as const);

  // Atomic: create user + optional tenant in one transaction
  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username,
        email,
        displayName: displayName || username,
        role,
        passwordHash: hashPassword(password),
        active: true,
        lastLoginAt: new Date(),
      },
    });

    let tenantData = undefined;
    if (orgName) {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingTenant = await tx.tenant.findUnique({ where: { slug } });
      if (existingTenant) {
        throw Object.assign(new Error('An organization with this name already exists'), {
          statusCode: 409,
        });
      }

      const planLimits: Record<string, number> = {
        free: 1, starter: 3, pro: 10, enterprise: 50,
      };
      const planBalances: Record<string, number> = {
        free: 100, starter: 500, pro: 2000, enterprise: 10000,
      };

      tenantData = await tx.tenant.create({
        data: {
          name: orgName,
          slug,
          industry: orgIndustry ?? '',
          plan: 'starter',
          contactEmail: email,
          ownerId: newUser.id,
          maxActiveContracts: planLimits['starter'],
          balance: planBalances['starter'],
          active: true,
        },
      });

      // Link user to the new tenant
      await tx.user.update({
        where: { id: newUser.id },
        data: { tenantId: tenantData.id },
      });

      // Re-fetch user with tenantId
      return {
        user: { ...newUser, tenantId: tenantData.id },
        tenant: tenantData,
      };
    }

    return { user: newUser, tenant: undefined };
  });

  if (orgName && result.tenant) {
    logAudit({
      persona: 'system',
      action: 'org_created_on_register',
      outcome: 'success',
      details: {
        tenantId: result.tenant.id,
        orgName,
        userId: result.user.id,
        username,
      },
    });
  }

  logAudit({
    persona: 'system',
    action: 'user_registered',
    outcome: 'success',
    details: { userId: result.user.id, username, orgName: orgName ?? null },
  });

  const token = signToken({
    sub: result.user.id,
    role: result.user.role,
    username,
    tenantId: result.user.tenantId,
  });

  const { passwordHash: _, ...safeUser } = result.user;
  res.status(201).json({ token, user: safeUser, tenant: result.tenant });
});

// ── GET /api/auth/me  (requires auth) ───────────────────────────────

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: (req as any).userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// ── PUT /api/auth/profile  (requires auth) ──────────────────────────

router.put('/profile', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: (req as any).userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { displayName, email, avatar } = req.body;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(email !== undefined && { email }),
      ...(avatar !== undefined && { avatar }),
    },
  });

  logAudit({
    persona: 'system',
    action: 'user_profile_updated',
    outcome: 'success',
    details: { userId: user.id, changes: { displayName, email, avatar } },
  });

  const { passwordHash, ...safeUser } = updated;
  res.json(safeUser);
});

// ── PUT /api/auth/password  (requires auth) ─────────────────────────

router.put('/password', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: (req as any).userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new passwords are required' });
    return;
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });
  res.json({ message: 'Password updated' });
});

export default router;
