import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('error', (err) => console.error('[redis]', err));

export async function connectRedis(): Promise<void> {
  await redis.connect();
  console.log('Redis connected');
}

// ── Pairing code helpers ────────────────────────────────────────────

const KEY_PREFIX = 'pairing:';

function pairingKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

export interface PairingCodeData {
  id: string;
  channel: string;
  code: string;
  description: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export async function setPairingCode(
  id: string,
  data: PairingCodeData,
  ttlSeconds = 600,
): Promise<void> {
  await redis.set(pairingKey(id), JSON.stringify(data), 'EX', ttlSeconds);
}

export async function getPairingCode(id: string): Promise<PairingCodeData | null> {
  const raw = await redis.get(pairingKey(id));
  return raw ? (JSON.parse(raw) as PairingCodeData) : null;
}

export async function deletePairingCode(id: string): Promise<void> {
  await redis.del(pairingKey(id));
}

export async function listPairingCodes(): Promise<PairingCodeData[]> {
  const keys = await redis.keys(`${KEY_PREFIX}*`);
  if (keys.length === 0) return [];
  const values = await redis.mget(...keys);
  return values
    .filter((v): v is string => v !== null)
    .map((v) => JSON.parse(v) as PairingCodeData);
}

export async function updatePairingCode(
  id: string,
  patch: Partial<PairingCodeData>,
): Promise<PairingCodeData | null> {
  const key = pairingKey(id);
  const [raw, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
  if (!raw) return null;
  const merged: PairingCodeData = { ...(JSON.parse(raw) as PairingCodeData), ...patch };
  const effectiveTtl = ttl > 0 ? ttl : 600;
  await redis.set(key, JSON.stringify(merged), 'EX', effectiveTtl);
  return merged;
}
