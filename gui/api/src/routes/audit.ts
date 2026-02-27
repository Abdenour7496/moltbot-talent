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
  const limit = parseInt(req.query.limit as string) || 50;

  if (action) entries = entries.filter((e) => e.action === action);
  if (persona) entries = entries.filter((e) => e.persona === persona);
  if (outcome) entries = entries.filter((e) => e.outcome === outcome);
  if (since) {
    const sinceDate = new Date(since);
    entries = entries.filter((e) => e.timestamp >= sinceDate);
  }

  // Most recent first, apply limit
  entries.reverse();
  entries = entries.slice(0, limit);

  res.json(entries);
});

export default router;
