/**
 * Orgo Guardrails
 *
 * Risk map, persona whitelist check, and idempotent approval-gate helper
 * used by the Orgo router to enforce access controls on every desktop action.
 */

import { personas } from '../state.js';
import { prisma, logAudit } from '../db/index.js';

// ── Risk classification ──────────────────────────────────────────────

export const ACTION_RISK: Record<string, 'low' | 'high'> = {
  screenshot: 'low',
  click: 'low',
  drag: 'low',
  type: 'low',
  key: 'low',
  scroll: 'low',
  wait: 'low',
  bash: 'high',
  exec: 'high',
  prompt: 'high',
  delete_computer: 'high',
  delete_workspace: 'high',
};

// ── Whitelist check ──────────────────────────────────────────────────

/**
 * Returns an error message string if the persona is not allowed to invoke
 * the given action, or null if the call is permitted.
 *
 * Deny-by-default: a persona with no allowedOrgoTools blocks all actions.
 */
export function checkWhitelist(personaId: string, action: string): string | null {
  const persona = personas.get(personaId);
  if (!persona) {
    return `Unknown persona "${personaId}"`;
  }
  const allowed = persona.config.allowedOrgoTools;
  if (!allowed || allowed.length === 0) {
    return `Persona "${personaId}" has no allowedOrgoTools configured`;
  }
  if (!allowed.includes(action)) {
    return `Action "${action}" is not allowed for persona "${personaId}"`;
  }
  return null;
}

// ── Approval gate ────────────────────────────────────────────────────

/**
 * Finds an existing non-denied, non-expired approval for (personaId, action,
 * computerId), or creates a new one with a 15-minute expiry.
 *
 * Idempotent: repeated calls with the same arguments return the same record
 * while it is still pending or granted.
 */
export async function findOrCreateApproval(
  personaId: string,
  action: string,
  computerId: string,
  context: Record<string, unknown>,
) {
  // Query all non-denied approvals for this action, then filter in memory
  // to avoid fragile JSON-path filtering across different DB drivers.
  const candidates = await prisma.approvalRequest.findMany({
    where: { action, status: { not: 'denied' } },
    orderBy: { requestedAt: 'desc' },
  });

  const now = new Date();
  const existing = candidates.find((a) => {
    if (a.expiresAt && a.expiresAt < now) return false; // expired → skip
    const ctx = a.context as Record<string, unknown>;
    return ctx.personaId === personaId && ctx.computerId === computerId;
  });

  if (existing) return existing;

  // Create a fresh approval with 15-minute window
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const risk = (ACTION_RISK[action] ?? 'high') as 'low' | 'high';

  const approval = await prisma.approvalRequest.create({
    data: {
      action,
      description: `Orgo action "${action}" requested by persona "${personaId}" on computer "${computerId}"`,
      risk,
      reversible: false,
      context: { personaId, computerId, ...context },
      expiresAt,
      status: 'pending',
    },
  });

  logAudit({
    persona: personaId,
    action: `orgo_${action}_approval_requested`,
    target: computerId,
    outcome: 'pending',
    details: { approvalId: approval.id, action, computerId },
  });

  return approval;
}
