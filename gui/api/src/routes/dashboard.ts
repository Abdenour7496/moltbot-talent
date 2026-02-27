import { Router } from 'express';
import {
  personas,
  knowledgeBases,
  approvals,
  auditLog,
  sessions,
  contracts,
  workflowRuns,
  skills,
  integrations,
  channels,
  cronTasks,
} from '../state.js';

const router = Router();

router.get('/', (_req, res) => {
  const activePersonas = Array.from(personas.values()).filter((p) => p.active);
  const pendingApprovalsList = Array.from(approvals.values()).filter(
    (a) => a.status === 'pending',
  );
  const activeSessions = Array.from(sessions.values()).filter(
    (s) => s.status === 'active',
  );
  const activeContracts = Array.from(contracts.values()).filter(
    (c) => c.status === 'active',
  );
  const workflowRunList = Array.from(workflowRuns.values());
  const runningWorkflows = workflowRunList.filter((r) => r.status === 'running');
  const escalatedWorkflows = workflowRunList.filter((r) => r.status === 'escalated');

  const recentActivity = auditLog
    .slice(-10)
    .reverse()
    .map((e) => ({
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
  const pendingApprovalsDetail = pendingApprovalsList.slice(0, 5).map((a) => ({
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
      const completed = r.steps.filter(
        (s) => s.status === 'done',
      ).length;
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
      pendingApprovals: pendingApprovalsList.length,
      totalAuditEntries: auditLog.length,
      activeSessions: activeSessions.length,
      totalContracts: contracts.size,
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
