import { Router } from 'express';
import { prisma } from '../db/index.js';

const router = Router();

router.get('/', async (req, res) => {
  const action = req.query.action as string | undefined;
  const persona = req.query.persona as string | undefined;
  const outcome = req.query.outcome as string | undefined;
  const since = req.query.since as string | undefined;
  const sessionId = req.query.sessionId as string | undefined;
  // RAG-specific filters — match against details written by knowledge_retrieved events
  const chunkId = req.query.chunkId as string | undefined;
  const kbId = req.query.kbId as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  const where: any = {};
  if (action) where.action = action;
  if (persona) where.persona = persona;
  if (outcome) where.outcome = outcome;
  if (sessionId) where.sessionId = sessionId;
  if (since) where.timestamp = { gte: new Date(since) };

  // JSON path filters for PostgreSQL
  if (chunkId) {
    where.details = { path: ['retrievalIds'], array_contains: chunkId };
  }
  if (kbId) {
    where.details = { path: ['kbId'], equals: kbId };
  }

  const entries = await prisma.auditEntry.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  res.json(entries);
});

export default router;
