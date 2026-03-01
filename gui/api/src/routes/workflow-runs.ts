import { createHash, randomUUID } from 'crypto';
import { Router, type Router as RouterType } from 'express';
import { prisma, logAudit } from '../db/index.js';
import type { StepDefinition, ExecutionEvent, EventType } from '../workflow/types.js';

const router: RouterType = Router();

// ── Constants ───────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = ['done', 'failed', 'escalated', 'cancelled'] as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

function sha256hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function deriveStepEventType(toStatus: string): EventType {
  const map: Record<string, EventType> = {
    running: 'step_started',
    retrying: 'step_retrying',
    done: 'step_completed',
    failed: 'step_failed',
    escalated: 'step_escalated',
    cancelled: 'step_cancelled',
  };
  return map[toStatus] ?? 'step_started';
}

function deriveRunEventType(status: string): EventType | null {
  const map: Record<string, EventType> = {
    completed: 'run_completed',
    failed: 'run_failed',
    escalated: 'run_escalated',
    cancelled: 'run_cancelled',
  };
  return map[status] ?? null;
}

function mapStep(s: any) {
  return {
    stepId: s.stepId,
    agentId: s.agentId,
    status: s.status,
    attempts: s.attempts,
    maxRetries: s.maxRetries,
    idempotencyKey: s.idempotencyKey ?? undefined,
    resolvedInput: s.resolvedInput ?? undefined,
    inputHash: s.inputHash ?? undefined,
    outputHash: s.outputHash ?? undefined,
    result: s.result ?? undefined,
    feedback: s.feedback ?? undefined,
    output: s.output ?? undefined,
    error: s.error ?? undefined,
    startedAt: s.startedAt ?? undefined,
    completedAt: s.completedAt ?? undefined,
  };
}

function mapRun(run: any) {
  return {
    ...run,
    stepDefinitions: run.stepDefinitions ?? {},
    executionLog: run.executionLog ?? [],
    steps: (run.steps ?? []).map(mapStep),
  };
}

const STEPS_INCLUDE = { steps: { orderBy: { createdAt: 'asc' as const } } };

// ── Routes ──────────────────────────────────────────────────────────────────

// List all workflow runs
router.get('/', async (req, res) => {
  const status = req.query.status as string | undefined;

  const runs = await prisma.workflowRun.findMany({
    where: status ? { status: status as any } : undefined,
    include: STEPS_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  res.json(runs.map(mapRun));
});

// Get single workflow run
router.get('/:id', async (req, res) => {
  const run = await prisma.workflowRun.findUnique({
    where: { id: req.params.id },
    include: STEPS_INCLUDE,
  });
  if (!run) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }
  res.json(mapRun(run));
});

// Replay manifest — full deterministic reconstruction of the run
router.get('/:id/replay', async (req, res) => {
  const run = await prisma.workflowRun.findUnique({
    where: { id: req.params.id },
    include: STEPS_INCLUDE,
  });
  if (!run) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }

  const events = ((run.executionLog as unknown as ExecutionEvent[]) ?? []).slice().sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  res.json({
    run: {
      id: run.id,
      workflowId: run.workflowId,
      workflowName: run.workflowName,
      task: run.task,
      status: run.status,
      variables: run.variables,
      stepDefinitions: run.stepDefinitions,
      createdAt: run.createdAt,
      completedAt: run.completedAt ?? undefined,
    },
    events,
    steps: (run.steps ?? []).map(mapStep),
  });
});

// Get single step detail
router.get('/:id/steps/:stepId', async (req, res) => {
  const stepRecord = await prisma.workflowStepExecution.findFirst({
    where: { runId: req.params.id, stepId: req.params.stepId },
  });
  if (!stepRecord) {
    res.status(404).json({ error: 'Step not found in this run' });
    return;
  }
  res.json(mapStep(stepRecord));
});

// Create a workflow run
router.post('/', async (req, res) => {
  const { workflowId, workflowName, task, steps, stepDefinitions } = req.body as {
    workflowId: string;
    workflowName: string;
    task: string;
    steps?: { stepId: string; agentId: string }[];
    stepDefinitions?: Record<string, Omit<StepDefinition, 'stepId'>>;
  };

  if (!workflowId || !task) {
    res.status(400).json({ error: 'workflowId and task are required' });
    return;
  }

  const defs = stepDefinitions ?? {};

  const createdEvent: ExecutionEvent = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: 'run_created',
    actor: 'system',
    data: { workflowId, task: task.slice(0, 200) },
  };

  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      workflowName: workflowName ?? workflowId,
      task,
      status: 'pending',
      variables: { task },
      stepDefinitions: defs as any,
      executionLog: [createdEvent] as any,
      steps: {
        create: (steps ?? []).map((s) => ({
          stepId: s.stepId,
          agentId: s.agentId,
          status: 'pending',
          attempts: 0,
          maxRetries: defs[s.stepId]?.maxRetries ?? 3,
        })),
      },
    },
    include: STEPS_INCLUDE,
  });

  logAudit({
    persona: 'system',
    action: 'workflow_run_created',
    target: run.id,
    outcome: 'success',
    details: { workflowId, task: task.slice(0, 200) },
  });

  res.status(201).json(mapRun(run));
});

// Update a workflow run step status
router.put('/:id/steps/:stepId', async (req, res) => {
  const run = await prisma.workflowRun.findUnique({
    where: { id: req.params.id },
    include: STEPS_INCLUDE,
  });
  if (!run) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }

  const stepRecord = await prisma.workflowStepExecution.findFirst({
    where: { runId: run.id, stepId: req.params.stepId },
  });
  if (!stepRecord) {
    res.status(404).json({ error: 'Step not found in this run' });
    return;
  }

  const { status, output, error, idempotencyKey, resolvedInput, result, feedback, actor } =
    req.body as {
      status?: string;
      output?: string;
      error?: string;
      idempotencyKey?: string;
      resolvedInput?: string;
      result?: Record<string, unknown>;
      feedback?: string;
      actor?: string;
    };

  // Guard 1 — Terminal state immutability
  const isTerminal = TERMINAL_STATUSES.includes(stepRecord.status as any);
  if (isTerminal) {
    if (idempotencyKey && stepRecord.idempotencyKey === idempotencyKey) {
      res.json(mapStep(stepRecord));
      return;
    }
    res.status(409).json({
      error: `Step '${stepRecord.stepId}' is already in terminal state '${stepRecord.status}'.`,
      currentStatus: stepRecord.status,
      hint: 'Terminal states are immutable. Create a new run to replay.',
    });
    return;
  }

  // Guard 2 — Max retries enforcement
  if (status === 'retrying') {
    const defs = run.stepDefinitions as unknown as Record<string, StepDefinition>;
    const maxRetries = defs?.[req.params.stepId]?.maxRetries ?? stepRecord.maxRetries ?? 3;
    if (stepRecord.attempts >= maxRetries) {
      res.status(409).json({
        error: `Step '${req.params.stepId}' has exhausted ${maxRetries} retries. Escalate or fail.`,
        attempts: stepRecord.attempts,
        maxRetries,
      });
      return;
    }
  }

  const inputHash = resolvedInput ? sha256hex(resolvedInput) : undefined;
  const outputHash = output ? sha256hex(output) : undefined;

  const updatedRun = await prisma.$transaction(async (tx) => {
    await tx.workflowStepExecution.update({
      where: { id: stepRecord.id },
      data: {
        ...(status && { status: status as any }),
        ...(output !== undefined && { output }),
        ...(error !== undefined && { error }),
        ...(idempotencyKey && { idempotencyKey }),
        ...(resolvedInput && { resolvedInput, inputHash }),
        ...(outputHash && { outputHash }),
        ...(result && { result: result as any }),
        ...(feedback !== undefined && { feedback }),
        ...(status === 'running' && !stepRecord.startedAt && { startedAt: new Date() }),
        ...((status === 'done' || status === 'failed') && { completedAt: new Date() }),
        ...(status === 'retrying' && { attempts: { increment: 1 } }),
      },
    });

    // Reload all steps to derive run status
    const allSteps = await tx.workflowStepExecution.findMany({
      where: { runId: run.id },
    });

    const stepsWithUpdate = allSteps.map((s) =>
      s.stepId === req.params.stepId ? { ...s, status: status ?? s.status } : s,
    );

    const allDone = stepsWithUpdate.every((s) => s.status === 'done');
    const anyFailed = stepsWithUpdate.some((s) => s.status === 'failed');
    const anyRunning = stepsWithUpdate.some((s) => s.status === 'running');
    const anyEscalated = stepsWithUpdate.some((s) => s.status === 'escalated');

    let newRunStatus: string = run.status;
    let completedAt: Date | null = null;

    if (allDone) {
      newRunStatus = 'completed';
      completedAt = new Date();
    } else if (anyEscalated) {
      newRunStatus = 'escalated';
    } else if (anyFailed) {
      newRunStatus = 'failed';
    } else if (anyRunning) {
      newRunStatus = 'running';
    }

    // Build step event + optional run event
    const stepEvent: ExecutionEvent = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: status ? deriveStepEventType(status) : 'step_started',
      stepId: req.params.stepId,
      fromStatus: stepRecord.status,
      toStatus: status ?? stepRecord.status,
      actor: actor ?? stepRecord.agentId,
      data: {
        ...(inputHash && { inputHash }),
        ...(outputHash && { outputHash }),
        ...(feedback && { feedback }),
      },
    };

    const currentLog = (run.executionLog as unknown as ExecutionEvent[]) ?? [];
    const events: ExecutionEvent[] = [...currentLog, stepEvent];

    if (newRunStatus !== run.status) {
      const runEventType = deriveRunEventType(newRunStatus);
      if (runEventType) {
        events.push({
          eventId: randomUUID(),
          timestamp: new Date().toISOString(),
          eventType: runEventType,
          actor: 'system',
          data: { previousStatus: run.status, newStatus: newRunStatus },
        });
      }
    }

    return tx.workflowRun.update({
      where: { id: run.id },
      data: {
        status: newRunStatus as any,
        ...(completedAt && { completedAt }),
        executionLog: events as any,
      },
      include: STEPS_INCLUDE,
    });
  });

  res.json(mapRun(updatedRun));
});

// Cancel a workflow run (pending or running only)
router.post('/:id/cancel', async (req, res) => {
  const run = await prisma.workflowRun.findUnique({
    where: { id: req.params.id },
    include: STEPS_INCLUDE,
  });
  if (!run) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }

  if (run.status !== 'pending' && run.status !== 'running') {
    res.status(409).json({ error: `Cannot cancel a run with status '${run.status}'` });
    return;
  }

  const now = new Date();

  const cancelEvent: ExecutionEvent = {
    eventId: randomUUID(),
    timestamp: now.toISOString(),
    eventType: 'run_cancelled',
    actor: 'system',
    data: { previousStatus: run.status },
  };

  const currentLog = (run.executionLog as unknown as ExecutionEvent[]) ?? [];

  await prisma.$transaction(async (tx) => {
    await tx.workflowStepExecution.updateMany({
      where: {
        runId: run.id,
        status: { in: ['pending', 'running'] },
      },
      data: { status: 'cancelled' },
    });

    await tx.workflowRun.update({
      where: { id: run.id },
      data: {
        status: 'cancelled',
        completedAt: now,
        executionLog: [...currentLog, cancelEvent] as any,
      },
    });
  });

  logAudit({
    persona: 'system',
    action: 'workflow_run_cancelled',
    target: run.id,
    outcome: 'success',
    details: { workflowId: run.workflowId },
  });

  const updated = await prisma.workflowRun.findUnique({
    where: { id: run.id },
    include: STEPS_INCLUDE,
  });
  res.json(mapRun(updated!));
});

// Delete a workflow run
router.delete('/:id', async (req, res) => {
  const exists = await prisma.workflowRun.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!exists) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }
  await prisma.workflowRun.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
