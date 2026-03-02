export { prisma, connectDB } from './client.js';
export {
  redis,
  connectRedis,
  setPairingCode,
  getPairingCode,
  deletePairingCode,
  listPairingCodes,
  updatePairingCode,
} from './redis.js';
export type { PairingCodeData } from './redis.js';

import { prisma } from './client.js';

/**
 * Fire-and-forget audit write.
 * Never throws — errors are logged to console.
 */
export function logAudit(data: {
  persona: string;
  sessionId?: string;
  action: string;
  target?: string;
  outcome: 'success' | 'failure' | 'pending';
  details?: Record<string, unknown>;
  approval?: Record<string, unknown>;
  actorId?: string;
}): void {
  prisma.auditEntry
    .create({
      data: {
        persona: data.persona,
        sessionId: data.sessionId ?? 'gui-session',
        action: data.action,
        target: data.target,
        outcome: data.outcome as any,
        details: data.details as any,
        approval: data.approval as any,
        actorId: data.actorId,
      },
    })
    .catch((err: Error) => console.error('[audit]', err));
}
