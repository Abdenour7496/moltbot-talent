import { Router } from 'express';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
} from '../auth.js';
import { users, tenants, nextTenantId, addAuditEntry, type Tenant } from '../state.js';

const router = Router();

// ── POST /api/auth/login ────────────────────────────────────────────

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = [...users.values()].find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!user.active) {
    res.status(403).json({ error: 'Account is deactivated' });
    return;
  }

  user.lastLoginAt = new Date();
  const token = signToken({
    sub: user.id,
    role: user.role,
    username: user.username,
    tenantId: user.tenantId,
  });

  addAuditEntry({
    persona: 'system',
    action: 'user_login',
    outcome: 'success',
    details: { userId: user.id, username: user.username },
  });

  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ── POST /api/auth/register ─────────────────────────────────────────

router.post('/register', (req, res) => {
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

  const existing = [...users.values()].find(
    (u) => u.username === username || u.email === email,
  );
  if (existing) {
    res.status(409).json({ error: 'Username or email already taken' });
    return;
  }

  const id = `usr_${Date.now()}`;
  const { orgName, orgIndustry } = req.body;

  const user: any = {
    id,
    username,
    email,
    displayName: displayName || username,
    role: orgName ? ('operator' as const) : ('viewer' as const),
    passwordHash: hashPassword(password),
    active: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  users.set(id, user);

  // If orgName is provided, create a new organization and link the user
  let tenantData: Tenant | undefined;
  if (orgName) {
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingTenant = [...tenants.values()].find((t) => t.slug === slug);
    if (existingTenant) {
      users.delete(id);
      res.status(409).json({ error: 'An organization with this name already exists' });
      return;
    }

    const tenantId = nextTenantId();
    const planLimits: Record<string, number> = { free: 1, starter: 3, pro: 10, enterprise: 50 };
    const planBalances: Record<string, number> = { free: 100, starter: 500, pro: 2000, enterprise: 10000 };

    tenantData = {
      id: tenantId,
      name: orgName,
      slug,
      industry: orgIndustry ?? '',
      plan: 'starter',
      contactEmail: email,
      ownerId: id,
      maxActiveContracts: planLimits['starter'],
      balance: planBalances['starter'],
      active: true,
      createdAt: new Date(),
    };

    tenants.set(tenantId, tenantData);
    user.tenantId = tenantId;

    addAuditEntry({
      persona: 'system',
      action: 'org_created_on_register',
      outcome: 'success',
      details: { tenantId, orgName, userId: id, username },
    });
  }

  const token = signToken({ sub: id, role: user.role, username, tenantId: user.tenantId });

  addAuditEntry({
    persona: 'system',
    action: 'user_registered',
    outcome: 'success',
    details: { userId: id, username, orgName: orgName ?? null },
  });

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser, tenant: tenantData });
});

// ── GET /api/auth/me  (requires auth) ───────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const user = users.get((req as any).userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// ── PUT /api/auth/profile  (requires auth) ──────────────────────────

router.put('/profile', requireAuth, (req, res) => {
  const user = users.get((req as any).userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { displayName, email, avatar } = req.body;
  if (displayName !== undefined) user.displayName = displayName;
  if (email !== undefined) user.email = email;
  if (avatar !== undefined) user.avatar = avatar;

  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// ── PUT /api/auth/password  (requires auth) ─────────────────────────

router.put('/password', requireAuth, (req, res) => {
  const user = users.get((req as any).userId);
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

  user.passwordHash = hashPassword(newPassword);
  res.json({ message: 'Password updated' });
});

export default router;
