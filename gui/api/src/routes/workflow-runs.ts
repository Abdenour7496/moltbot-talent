import { Router, type Router as RouterType } from 'express';
import {
  workflowRuns,
  nextWorkflowRunId,
  addAuditEntry,
  type WorkflowRunRecord,
  type WorkflowStepExecution,
} from '../state.js';

const router: RouterType = Router();

// List all workflow runs
router.get('/', (req, res) => {
  const status = req.query.status as string | undefined;
  let list = Array.from(workflowRuns.values());
  if (status) {
    list = list.filter((r) => r.status === status);
  }
  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json(list);
});

// Get single workflow run
router.get('/:id', (req, res) => {
  const run = workflowRuns.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }
  res.json(run);
});

// Create a workflow run (simulated — in production the engine creates these)
router.post('/', (req, res) => {
  const { workflowId, workflowName, task, steps } = req.body as {
    workflowId: string;
    workflowName: string;
    task: string;
    steps?: { stepId: string; agentId: string }[];
  };

  if (!workflowId || !task) {
    res.status(400).json({ error: 'workflowId and task are required' });
    return;
  }

  const now = new Date();
  const defaultSteps: WorkflowStepExecution[] = (steps ?? []).map((s) => ({
    stepId: s.stepId,
    agentId: s.agentId,
    status: 'pending',
    attempts: 0,
  }));

  const run: WorkflowRunRecord = {
    id: nextWorkflowRunId(),
    workflowId,
    workflowName: workflowName ?? workflowId,
    task,
    status: 'pending',
    steps: defaultSteps,
    variables: { task },
    createdAt: now,
    updatedAt: now,
  };

  workflowRuns.set(run.id, run);

  addAuditEntry({
    persona: 'system',
    action: 'workflow_run_created',
    target: run.id,
    outcome: 'success',
    details: { workflowId, task: task.slice(0, 200) },
  });

  res.status(201).json(run);
});

// Update a workflow run step status (for simulation / webhook updates)
router.put('/:id/steps/:stepId', (req, res) => {
  const run = workflowRuns.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }

  const step = run.steps.find((s) => s.stepId === req.params.stepId);
  if (!step) {
    res.status(404).json({ error: 'Step not found in this run' });
    return;
  }

  const { status, output, error } = req.body;
  if (status) step.status = status;
  if (output) step.output = output;
  if (error) step.error = error;
  if (status === 'running' && !step.startedAt) step.startedAt = new Date();
  if (status === 'done' || status === 'failed') step.completedAt = new Date();
  step.attempts = (step.attempts ?? 0) + (status === 'retrying' ? 1 : 0);

  run.updatedAt = new Date();

  // Auto-advance run status
  const allDone = run.steps.every((s) => s.status === 'done');
  const anyFailed = run.steps.some((s) => s.status === 'failed');
  const anyRunning = run.steps.some((s) => s.status === 'running');
  const anyEscalated = run.steps.some((s) => s.status === 'escalated');

  if (allDone) {
    run.status = 'completed';
    run.completedAt = new Date();
  } else if (anyEscalated) {
    run.status = 'escalated';
  } else if (anyFailed) {
    run.status = 'failed';
  } else if (anyRunning) {
    run.status = 'running';
  }

  res.json(run);
});

// Cancel a workflow run (pending or running only)
router.post('/:id/cancel', (req, res) => {
  const run = workflowRuns.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }

  if (run.status !== 'pending' && run.status !== 'running') {
    res.status(409).json({ error: `Cannot cancel a run with status '${run.status}'` });
    return;
  }

  run.status = 'cancelled' as any;
  run.updatedAt = new Date();
  run.completedAt = new Date();

  // Mark all non-terminal steps as cancelled
  for (const step of run.steps) {
    if (step.status === 'pending' || step.status === 'running') {
      step.status = 'cancelled' as any;
    }
  }

  addAuditEntry({
    persona: 'system',
    action: 'workflow_run_cancelled',
    target: run.id,
    outcome: 'success',
    details: { workflowId: run.workflowId },
  });

  res.json(run);
});

// Delete a workflow run
router.delete('/:id', (req, res) => {
  if (!workflowRuns.has(req.params.id)) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }
  workflowRuns.delete(req.params.id);
  res.json({ ok: true });
});

export default router;

// ── Seed demo workflow runs ──────────────────────────────────────

function seedWorkflowRuns() {
  const now = new Date();

  // Incident response run — completed
  const run1: WorkflowRunRecord = {
    id: nextWorkflowRunId(),
    workflowId: 'incident-response',
    workflowName: 'Incident Response Pipeline',
    task: 'Production API returning 500 errors on /api/payments endpoint since 14:30 UTC',
    status: 'completed',
    steps: [
      { stepId: 'triage', agentId: 'it-ops-specialist', status: 'done', attempts: 1, output: 'Root cause: database connection pool exhausted', startedAt: new Date(now.getTime() - 3600_000), completedAt: new Date(now.getTime() - 3300_000) },
      { stepId: 'investigate', agentId: 'bug-triager', status: 'done', attempts: 1, output: 'Connection leak in PaymentService.processRefund()', startedAt: new Date(now.getTime() - 3300_000), completedAt: new Date(now.getTime() - 2700_000) },
      { stepId: 'fix', agentId: 'it-ops-specialist', status: 'done', attempts: 2, output: 'Fixed connection leak, added pool health check', startedAt: new Date(now.getTime() - 2700_000), completedAt: new Date(now.getTime() - 1800_000) },
      { stepId: 'verify', agentId: 'code-reviewer', status: 'done', attempts: 1, output: 'Fix verified, no regressions found', startedAt: new Date(now.getTime() - 1800_000), completedAt: new Date(now.getTime() - 1200_000) },
      { stepId: 'review', agentId: 'code-reviewer', status: 'done', attempts: 1, output: 'PR approved, ready to merge', startedAt: new Date(now.getTime() - 1200_000), completedAt: new Date(now.getTime() - 600_000) },
    ],
    variables: { task: 'Production API returning 500 errors', root_cause: 'connection pool exhausted', severity: 'SEV-2' },
    createdAt: new Date(now.getTime() - 3600_000),
    updatedAt: new Date(now.getTime() - 600_000),
    completedAt: new Date(now.getTime() - 600_000),
  };
  workflowRuns.set(run1.id, run1);

  // Security audit — in progress
  const run2: WorkflowRunRecord = {
    id: nextWorkflowRunId(),
    workflowId: 'security-audit',
    workflowName: 'Security Audit Pipeline',
    task: 'Quarterly security audit for payment microservices',
    status: 'running',
    steps: [
      { stepId: 'scan', agentId: 'security-auditor', status: 'done', attempts: 1, output: 'Found 3 critical, 12 high, 28 medium vulnerabilities', startedAt: new Date(now.getTime() - 7200_000), completedAt: new Date(now.getTime() - 5400_000) },
      { stepId: 'prioritize', agentId: 'security-auditor', status: 'done', attempts: 1, output: 'Prioritized: 3 critical CVEs for immediate fix', startedAt: new Date(now.getTime() - 5400_000), completedAt: new Date(now.getTime() - 4200_000) },
      { stepId: 'fix', agentId: 'security-auditor', status: 'running', attempts: 1, startedAt: new Date(now.getTime() - 4200_000) },
      { stepId: 'verify', agentId: 'code-reviewer', status: 'pending', attempts: 0 },
      { stepId: 'test', agentId: 'code-reviewer', status: 'pending', attempts: 0 },
      { stepId: 'report', agentId: 'code-reviewer', status: 'pending', attempts: 0 },
    ],
    variables: { task: 'Quarterly security audit', vulnerabilities_critical: '3', vulnerabilities_high: '12' },
    createdAt: new Date(now.getTime() - 7200_000),
    updatedAt: new Date(now.getTime() - 100_000),
  };
  workflowRuns.set(run2.id, run2);

  // Change management — escalated
  const run3: WorkflowRunRecord = {
    id: nextWorkflowRunId(),
    workflowId: 'change-management',
    workflowName: 'Change Management Pipeline',
    task: 'Upgrade Kubernetes cluster from 1.28 to 1.30',
    status: 'escalated',
    steps: [
      { stepId: 'plan', agentId: 'it-ops-specialist', status: 'done', attempts: 1, output: 'Change plan created with rollback strategy', startedAt: new Date(now.getTime() - 86400_000), completedAt: new Date(now.getTime() - 82800_000) },
      { stepId: 'implement', agentId: 'it-ops-specialist', status: 'done', attempts: 1, output: 'Control plane upgraded successfully', startedAt: new Date(now.getTime() - 82800_000), completedAt: new Date(now.getTime() - 79200_000) },
      { stepId: 'security-scan', agentId: 'security-auditor', status: 'done', attempts: 1, output: 'No new vulnerabilities introduced', startedAt: new Date(now.getTime() - 79200_000), completedAt: new Date(now.getTime() - 75600_000) },
      { stepId: 'review', agentId: 'code-reviewer', status: 'escalated', attempts: 3, error: 'Worker node drain failed on node-pool-3, requires manual intervention', startedAt: new Date(now.getTime() - 75600_000) },
      { stepId: 'deploy', agentId: 'it-ops-specialist', status: 'pending', attempts: 0 },
    ],
    variables: { task: 'K8s upgrade 1.28→1.30', change_type: 'major', risk_level: 'high' },
    createdAt: new Date(now.getTime() - 86400_000),
    updatedAt: new Date(now.getTime() - 72000_000),
  };
  workflowRuns.set(run3.id, run3);
}

seedWorkflowRuns();
