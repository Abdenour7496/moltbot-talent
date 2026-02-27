import { Router } from 'express';
import { approvals, addAuditEntry, nextApprovalId, type ApprovalRequest } from '../state.js';

const router = Router();

// List approvals (optionally filtered by status)
router.get('/', (req, res) => {
  const status = req.query.status as string | undefined;
  let list = Array.from(approvals.values());
  if (status) {
    list = list.filter((a) => a.status === status);
  }
  // Most recent first
  list.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  res.json(list);
});

// Get single approval
router.get('/:id', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) {
    res.status(404).json({ error: 'Approval not found' });
    return;
  }
  res.json(approval);
});

// Grant approval
router.post('/:id/grant', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) {
    res.status(404).json({ error: 'Approval not found' });
    return;
  }
  if (approval.status !== 'pending') {
    res.status(400).json({ error: 'Approval is not pending' });
    return;
  }

  const grantedBy = req.body.grantedBy ?? 'gui-user';
  approval.status = 'granted';
  approval.resolvedBy = grantedBy;
  approval.resolvedAt = new Date();

  addAuditEntry({
    persona: 'system',
    action: 'approval_granted',
    target: approval.action,
    approval: { required: true, grantedBy, grantedAt: approval.resolvedAt },
    outcome: 'success',
    details: { approvalId: approval.id },
  });

  res.json(approval);
});

// Deny approval
router.post('/:id/deny', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) {
    res.status(404).json({ error: 'Approval not found' });
    return;
  }
  if (approval.status !== 'pending') {
    res.status(400).json({ error: 'Approval is not pending' });
    return;
  }

  const deniedBy = req.body.deniedBy ?? 'gui-user';
  const reason = req.body.reason ?? '';
  approval.status = 'denied';
  approval.resolvedBy = deniedBy;
  approval.resolvedAt = new Date();

  addAuditEntry({
    persona: 'system',
    action: 'approval_denied',
    target: approval.action,
    approval: { required: true },
    outcome: 'failure',
    details: { approvalId: approval.id, deniedBy, reason },
  });

  res.json(approval);
});

export default router;
