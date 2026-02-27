import { Router } from 'express';
import { usageRecords, addAuditEntry } from '../state.js';

const router = Router();

// Get usage stats
router.get('/', (req, res) => {
  const { personaId, sessionId, from, to } = req.query;
  let records = [...usageRecords];

  if (personaId) records = records.filter((r) => r.personaId === personaId);
  if (sessionId) records = records.filter((r) => r.sessionId === sessionId);
  if (from) records = records.filter((r) => r.timestamp >= new Date(from as string));
  if (to) records = records.filter((r) => r.timestamp <= new Date(to as string));

  // Aggregate totals
  const totals = records.reduce(
    (acc, r) => {
      acc.totalTokens += r.inputTokens + r.outputTokens;
      acc.totalInputTokens += r.inputTokens;
      acc.totalOutputTokens += r.outputTokens;
      acc.totalCost += r.cost;
      acc.requestCount++;
      return acc;
    },
    { totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, requestCount: 0 },
  );

  // Per-model breakdown
  const byModel: Record<string, { tokens: number; cost: number; count: number }> = {};
  for (const r of records) {
    if (!byModel[r.model]) byModel[r.model] = { tokens: 0, cost: 0, count: 0 };
    byModel[r.model].tokens += r.inputTokens + r.outputTokens;
    byModel[r.model].cost += r.cost;
    byModel[r.model].count++;
  }

  res.json({
    totals,
    byModel,
    records: records.slice(-100), // Last 100 records
  });
});

// Record usage (called by agent runtime)
router.post('/', (req, res) => {
  const { personaId, sessionId, model, provider, inputTokens, outputTokens, cost } = req.body;
  const record = {
    id: `usage_${usageRecords.length + 1}`,
    personaId: personaId ?? 'system',
    sessionId: sessionId ?? 'unknown',
    model: model ?? 'unknown',
    provider: provider ?? 'unknown',
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    cost: cost ?? 0,
    timestamp: new Date(),
  };
  usageRecords.push(record);
  if (usageRecords.length > 10000) usageRecords.splice(0, usageRecords.length - 10000);
  res.status(201).json(record);
});

export default router;
