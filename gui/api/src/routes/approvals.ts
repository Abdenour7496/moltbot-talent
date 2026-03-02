import { Router } from 'express';
import { prisma, logAudit } from '../db/index.js';

const router = Router();

// List approvals (optionally filtered by status)
router.get('/', async (req, res) => {
  const status = req.query.status as string | undefined;

  const approvals = await prisma.approvalRequest.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { requestedAt: 'desc' },
  });

  res.json(approvals);
});

// Get single approval
router.get('/:id', async (req, res) => {
  const approval = await prisma.approvalRequest.findUnique({
    where: { id: req.params.id },
  });
  if (!approval) {
    res.status(404).json({ error: 'Approval not found' });
    return;
  }
  res.json(approval);
});

// Grant approval
router.post('/:id/grant', async (req, res) => {
  const approval = await prisma.approvalRequest.findUnique({
    where: { id: req.params.id },
  });
  if (!approval) {
    res.status(404).json({ error: 'Approval not found' });
    return;
  }
  if (approval.status !== 'pending') {
    res.status(400).json({ error: 'Approval is not pending' });
    return;
  }

  const grantedBy: string = req.body.grantedBy ?? 'gui-user';
  const resolvedAt = new Date();

  const updated = await prisma.approvalRequest.update({
    where: { id: approval.id },
    data: {
      status: 'granted',
      resolvedBy: grantedBy,
      resolvedAt,
    },
  });

  logAudit({
    persona: 'system',
    action: 'approval_granted',
    target: approval.action,
    approval: { required: true, grantedBy, grantedAt: resolvedAt },
    outcome: 'success',
    details: { approvalId: approval.id },
  });

  res.json(updated);
});

// Deny approval
router.post('/:id/deny', async (req, res) => {
  const approval = await prisma.approvalRequest.findUnique({
    where: { id: req.params.id },
  });
  if (!approval) {
    res.status(404).json({ error: 'Approval not found' });
    return;
  }
  if (approval.status !== 'pending') {
    res.status(400).json({ error: 'Approval is not pending' });
    return;
  }

  const deniedBy: string = req.body.deniedBy ?? 'gui-user';
  const reason: string = req.body.reason ?? '';

  const updated = await prisma.approvalRequest.update({
    where: { id: approval.id },
    data: {
      status: 'denied',
      resolvedBy: deniedBy,
      resolvedAt: new Date(),
    },
  });

  logAudit({
    persona: 'system',
    action: 'approval_denied',
    target: approval.action,
    approval: { required: true },
    outcome: 'failure',
    details: { approvalId: approval.id, deniedBy, reason },
  });

  res.json(updated);
});

export default router;
