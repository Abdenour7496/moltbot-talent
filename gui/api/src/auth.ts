/**
 * Authentication utilities and Express middleware.
 *
 * Uses Node built-in crypto for JWT signing / password hashing
 * so we don't need any extra dependencies.
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET ?? 'moltbot-dev-secret-change-in-production';
const TOKEN_EXPIRY_HOURS = 24;

// ── JWT helpers ─────────────────────────────────────────────────────

export function signToken(
  payload: Record<string, unknown>,
  expiresInHours = TOKEN_EXPIRY_HOURS,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresInHours * 3600 }),
  ).toString('base64url');

  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expected = createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest();

    const sigBuffer = Buffer.from(signature, 'base64url');
    if (sigBuffer.length !== expected.length || !timingSafeEqual(sigBuffer, expected)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Password helpers ────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derived);
}

// ── Express middleware ──────────────────────────────────────────────

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  (req as any).userId = payload.sub;
  (req as any).userRole = payload.role;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes((req as any).userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
