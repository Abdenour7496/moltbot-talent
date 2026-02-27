import { Router } from 'express';
import { requireRole, hashPassword } from '../auth.js';
import { users, addAuditEntry } from '../state.js';

const router = Router();

// Every route in this file requires the 'admin' role
router.use(requireRole('admin'));

// ── GET /api/users ──────────────────────────────────────────────────

router.get('/', (_req, res) => {
  const list = [...users.values()].map(({ passwordHash, ...u }) => u);
  res.json(list);
});

// ── GET /api/users/:id ─────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// ── POST /api/users  (create by admin) ─────────────────────────────

router.post('/', (req, res) => {
  const { username, email, displayName, password, role } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
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
  const user = {
    id,
    username,
    email,
    displayName: displayName || username,
    role: (role ?? 'viewer') as 'admin' | 'operator' | 'viewer',
    passwordHash: hashPassword(password),
    active: true,
    createdAt: new Date(),
  };

  users.set(id, user);

  addAuditEntry({
    persona: 'system',
    action: 'user_created',
    outcome: 'success',
    details: { userId: id, username, createdBy: (req as any).userId },
  });

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json(safeUser);
});

// ── PUT /api/users/:id ─────────────────────────────────────────────

router.put('/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { role, active, displayName, email } = req.body;
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = active;
  if (displayName !== undefined) user.displayName = displayName;
  if (email !== undefined) user.email = email;

  addAuditEntry({
    persona: 'system',
    action: 'user_updated',
    outcome: 'success',
    details: { userId: user.id, changes: req.body, updatedBy: (req as any).userId },
  });

  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// ── DELETE /api/users/:id ───────────────────────────────────────────

router.delete('/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent self-deletion
  if (user.id === (req as any).userId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  users.delete(req.params.id);

  addAuditEntry({
    persona: 'system',
    action: 'user_deleted',
    outcome: 'success',
    details: { userId: user.id, username: user.username, deletedBy: (req as any).userId },
  });

  res.json({ message: 'User deleted' });
});

// ── POST /api/users/:id/reset-password ──────────────────────────────

router.post('/:id/reset-password', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  user.passwordHash = hashPassword(newPassword);
  res.json({ message: 'Password reset' });
});

export default router;
