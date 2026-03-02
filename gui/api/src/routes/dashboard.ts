import { Router } from 'express';
import {
  personas,
  knowledgeBases,
  sessions,
  skills,
  integrations,
  channels,
  cronTasks,
} from '../state.js';
import { prisma } from '../db/index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const activePersonas = Array.from(personas.values()).filter((p) => p.active);
  const activeSessions = Array.from(sessions.values()).filter((s) => s.status === 'active');

  // Prisma-backed queries
  const [
    pendingApprovals,
    recentAudit,
    workflowRunList,
    activeContracts,
    totalContracts,
    totalAuditEntries,
  ] = await Promise.all([
    prisma.approvalRequest.findMany({ where: { status: 'pending' }, orderBy: { requestedAt: 'desc' }, take: 5 }),
    prisma.auditEntry.findMany({ orderBy: { timestamp: 'desc' }, take: 10 }),
    prisma.workflowRun.findMany({ include: { steps: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.contract.findMany({ where: { status: 'active' } }),
    prisma.contract.count(),
    prisma.auditEntry.count(),
  ]);

  const runningWorkflows = workflowRunList.filter((r) => r.status === 'running');
  const escalatedWorkflows = workflowRunList.filter((r) => r.status === 'escalated');

  const recentActivity = recentAudit.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    action: e.action,
    persona: e.persona,
    outcome: e.outcome,
    target: e.target,
  }));

  // Top personas with summary info
  const topPersonas = Array.from(personas.values())
    .slice(0, 6)
    .map((p) => ({
      id: p.config.id,
      name: p.config.name,
      active: p.active,
      skills: p.config.skills ?? [],
      loadedAt: p.loadedAt ?? null,
    }));

  // Pending approvals detail
  const pendingApprovalsDetail = pendingApprovals.slice(0, 5).map((a) => ({
    id: a.id,
    action: a.action,
    description: a.description,
    risk: a.risk,
    requestedAt: a.requestedAt,
  }));

  // Active workflow runs summary
  const workflowSummary = workflowRunList
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)
    .map((r) => {
      const completed = r.steps.filter((s) => s.status === 'done').length;
      return {
        id: r.id,
        workflowName: r.workflowName,
        task: r.task,
        status: r.status,
        progress: r.steps.length > 0 ? Math.round((completed / r.steps.length) * 100) : 0,
        stepsCompleted: completed,
        stepsTotal: r.steps.length,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

  // Active contracts summary
  const contractsSummary = activeContracts.slice(0, 5).map((c) => ({
    id: c.id,
    title: c.title,
    agentId: c.agentId,
    status: c.status,
    actualHours: c.actualHours,
    estimatedHours: c.estimatedHours,
  }));

  res.json({
    stats: {
      totalPersonas: personas.size,
      activePersonas: activePersonas.length,
      knowledgeBases: knowledgeBases.size,
      pendingApprovals: pendingApprovals.length,
      totalAuditEntries,
      activeSessions: activeSessions.length,
      totalContracts,
      activeContracts: activeContracts.length,
      totalWorkflowRuns: workflowRunList.length,
      runningWorkflows: runningWorkflows.length,
      escalatedWorkflows: escalatedWorkflows.length,
      totalSkills: skills.size,
      totalIntegrations: integrations.size,
      totalChannels: channels.size,
      scheduledTasks: cronTasks.size,
    },
    recentActivity,
    health: {
      api: 'healthy',
      vectorDb: knowledgeBases.size > 0 ? 'connected' : 'idle',
      uptime: process.uptime(),
      personas: personas.size,
      sessions: sessions.size,
      channels: channels.size,
      integrations: integrations.size,
    },
    topPersonas,
    pendingApprovals: pendingApprovalsDetail,
    workflowSummary,
    contractsSummary,
  });
});

export default router;
