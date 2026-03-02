import { Router } from 'express';
import { requireRole, hashPassword } from '../auth.js';
import { prisma, logAudit } from '../db/index.js';

const router = Router();

// Every route in this file requires the 'admin' role
router.use(requireRole('admin'));

// ── GET /api/users ──────────────────────────────────────────────────

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      avatar: true,
      active: true,
      tenantId: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json(users);
});

// ── GET /api/users/:id ─────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      avatar: true,
      active: true,
      tenantId: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

// ── POST /api/users  (create by admin) ─────────────────────────────

router.post('/', async (req, res) => {
  const { username, email, displayName, password, role } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    res.status(409).json({ error: 'Username or email already taken' });
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      displayName: displayName || username,
      role: (role ?? 'viewer') as any,
      passwordHash: hashPassword(password),
      active: true,
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      avatar: true,
      active: true,
      tenantId: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logAudit({
    persona: 'system',
    action: 'user_created',
    outcome: 'success',
    details: { userId: user.id, username, createdBy: (req as any).userId },
  });

  res.status(201).json(user);
});

// ── PUT /api/users/:id ─────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  const exists = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { role, active, displayName, email } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(role !== undefined && { role }),
      ...(active !== undefined && { active }),
      ...(displayName !== undefined && { displayName }),
      ...(email !== undefined && { email }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      avatar: true,
      active: true,
      tenantId: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logAudit({
    persona: 'system',
    action: 'user_updated',
    outcome: 'success',
    details: { userId: user.id, changes: req.body, updatedBy: (req as any).userId },
  });

  res.json(user);
});

// ── DELETE /api/users/:id ───────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, username: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.id === (req as any).userId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  await prisma.user.delete({ where: { id: req.params.id } });

  logAudit({
    persona: 'system',
    action: 'user_deleted',
    outcome: 'success',
    details: { userId: user.id, username: user.username, deletedBy: (req as any).userId },
  });

  res.json({ message: 'User deleted' });
});

// ── POST /api/users/:id/reset-password ──────────────────────────────

router.post('/:id/reset-password', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  logAudit({
    persona: 'system',
    action: 'user_password_reset',
    outcome: 'success',
    details: { userId: req.params.id, resetBy: (req as any).userId },
  });

  res.json({ message: 'Password reset' });
});

export default router;
