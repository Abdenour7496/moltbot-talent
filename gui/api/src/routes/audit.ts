import { Router } from 'express';
import { auditLog } from '../state.js';

const router = Router();

router.get('/', (req, res) => {
  let entries = [...auditLog];

  // Filters
  const action = req.query.action as string | undefined;
  const persona = req.query.persona as string | undefined;
  const outcome = req.query.outcome as string | undefined;
  const since = req.query.since as string | undefined;
  const sessionId = req.query.sessionId as string | undefined;
  // RAG-specific filters — match against details written by knowledge_retrieved events
  const chunkId = req.query.chunkId as string | undefined;
  const kbId = req.query.kbId as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  if (action) entries = entries.filter((e) => e.action === action);
  if (persona) entries = entries.filter((e) => e.persona === persona);
  if (outcome) entries = entries.filter((e) => e.outcome === outcome);
  if (sessionId) entries = entries.filter((e) => e.sessionId === sessionId);
  if (since) {
    const sinceDate = new Date(since);
    entries = entries.filter((e) => e.timestamp >= sinceDate);
  }
  if (chunkId) {
    entries = entries.filter((e) => {
      const ids = e.details?.retrievalIds;
      return Array.isArray(ids) && ids.includes(chunkId);
    });
  }
  if (kbId) {
    entries = entries.filter((e) => e.details?.kbId === kbId);
  }

  // Most recent first, apply limit
  entries.reverse();
  entries = entries.slice(0, limit);

  res.json(entries);
});

export default router;
