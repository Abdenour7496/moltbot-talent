import { Router } from 'express';
import {
  cronTasks,
  nextCronId,
  addAuditEntry,
  type CronTask,
} from '../state.js';

const router = Router();

// List all cron tasks
router.get('/', (_req, res) => {
  const list = Array.from(cronTasks.values());
  res.json(list);
});

// Create cron task
router.post('/', (req, res) => {
  const { name, personaId, schedule, action, enabled } = req.body;
  if (!name || !personaId || !schedule || !action) {
    res.status(400).json({ error: 'name, personaId, schedule, and action are required' });
    return;
  }

  const task: CronTask = {
    id: nextCronId(),
    name,
    personaId,
    schedule,
    action,
    enabled: enabled ?? true,
    runCount: 0,
  };
  cronTasks.set(task.id, task);

  addAuditEntry({
    persona: personaId,
    action: 'cron_created',
    target: task.id,
    outcome: 'success',
    details: { name, schedule },
  });

  res.status(201).json(task);
});

// Update cron task
router.put('/:id', (req, res) => {
  const task = cronTasks.get(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Cron task not found' });
    return;
  }

  const { name, personaId, schedule, action, enabled } = req.body;
  if (name !== undefined) task.name = name;
  if (personaId !== undefined) task.personaId = personaId;
  if (schedule !== undefined) task.schedule = schedule;
  if (action !== undefined) task.action = action;
  if (enabled !== undefined) task.enabled = enabled;

  res.json(task);
});

// Delete cron task
router.delete('/:id', (req, res) => {
  const task = cronTasks.get(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Cron task not found' });
    return;
  }
  cronTasks.delete(req.params.id);

  addAuditEntry({
    persona: task.personaId,
    action: 'cron_deleted',
    target: task.id,
    outcome: 'success',
  });

  res.json({ ok: true });
});

// Manually trigger a cron task
router.post('/:id/trigger', (req, res) => {
  const task = cronTasks.get(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Cron task not found' });
    return;
  }

  task.runCount++;
  task.lastRunAt = new Date();
  task.lastOutcome = 'success';

  addAuditEntry({
    persona: task.personaId,
    action: 'cron_triggered',
    target: task.id,
    outcome: 'success',
    details: { name: task.name, manual: true },
  });

  res.json({
    taskId: task.id,
    success: true,
    message: `Task "${task.name}" triggered manually`,
    triggeredAt: task.lastRunAt,
  });
});

export default router;
