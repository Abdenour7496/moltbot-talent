/**
 * Idempotent seed for Phase 1 demo data.
 * Uses deterministic short IDs so it can be run multiple times safely.
 * Run with: pnpm --filter gui-api db:seed
 */

import { PrismaClient } from '@prisma/client';
import { createHmac, randomBytes, scryptSync } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Seeding Phase 1 demo data...');

  // ── Users ────────────────────────────────────────────────────────

  await prisma.user.upsert({
    where: { id: 'usr_1' },
    create: {
      id: 'usr_1',
      username: 'admin',
      email: 'admin@moltbot.local',
      displayName: 'Administrator',
      role: 'admin',
      passwordHash: hashPassword('admin'),
      active: true,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: 'usr_2' },
    create: {
      id: 'usr_2',
      username: 'operator',
      email: 'operator@moltbot.local',
      displayName: 'Ops Operator',
      role: 'operator',
      passwordHash: hashPassword('operator'),
      active: true,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: 'usr_3' },
    create: {
      id: 'usr_3',
      username: 'viewer',
      email: 'viewer@moltbot.local',
      displayName: 'Read Only',
      role: 'viewer',
      passwordHash: hashPassword('viewer'),
      active: true,
    },
    update: {},
  });

  // ── Tenants ──────────────────────────────────────────────────────

  await prisma.tenant.upsert({
    where: { id: 'ten_1' },
    create: {
      id: 'ten_1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      industry: 'FinTech',
      plan: 'pro',
      contactEmail: 'ops@acme-corp.io',
      ownerId: 'usr_2',
      maxActiveContracts: 10,
      balance: 5000,
      active: true,
      createdAt: new Date(Date.now() - 30 * 86_400_000),
    },
    update: {},
  });

  await prisma.tenant.upsert({
    where: { id: 'ten_2' },
    create: {
      id: 'ten_2',
      name: 'Nebula Labs',
      slug: 'nebula-labs',
      industry: 'HealthTech',
      plan: 'starter',
      contactEmail: 'eng@nebula-labs.co',
      ownerId: 'usr_3',
      maxActiveContracts: 3,
      balance: 1200,
      active: true,
      createdAt: new Date(Date.now() - 14 * 86_400_000),
    },
    update: {},
  });

  await prisma.tenant.upsert({
    where: { id: 'ten_3' },
    create: {
      id: 'ten_3',
      name: 'Quantum Dynamics',
      slug: 'quantum-dynamics',
      industry: 'Aerospace',
      plan: 'enterprise',
      contactEmail: 'devops@qdyn.space',
      ownerId: 'usr_1',
      maxActiveContracts: 50,
      balance: 25000,
      active: true,
      createdAt: new Date(Date.now() - 90 * 86_400_000),
    },
    update: {},
  });

  // Link users to tenants
  await prisma.user.update({ where: { id: 'usr_2' }, data: { tenantId: 'ten_1' } });
  await prisma.user.update({ where: { id: 'usr_3' }, data: { tenantId: 'ten_2' } });

  // ── Contracts ────────────────────────────────────────────────────

  await prisma.contract.upsert({
    where: { id: 'ctr_1' },
    create: {
      id: 'ctr_1',
      tenantId: 'ten_1',
      agentId: 'agt_3',
      clientUserId: 'usr_2',
      title: 'Real-time analytics pipeline',
      description: 'Build a Kafka-to-Snowflake streaming pipeline for transaction analytics with dbt transformations.',
      specialty: 'data-engineering',
      status: 'active',
      hourlyRate: 105,
      estimatedHours: 80,
      actualHours: 34,
      totalCost: 3570,
      startedAt: new Date(Date.now() - 7 * 86_400_000),
      createdAt: new Date(Date.now() - 8 * 86_400_000),
      milestones: {
        create: [
          {
            id: 'ms_1',
            title: 'Pipeline design & schema',
            description: 'Design data flow and target schema',
            status: 'completed',
            completedAt: new Date(Date.now() - 5 * 86_400_000),
            amount: 1050,
          },
          {
            id: 'ms_2',
            title: 'Kafka ingestion layer',
            description: 'Set up Kafka topics and producers',
            status: 'in-progress',
            amount: 1260,
          },
          {
            id: 'ms_3',
            title: 'dbt models & dashboards',
            description: 'Create transformation models and Snowflake dashboards',
            status: 'pending',
            amount: 1260,
          },
        ],
      },
      messages: {
        create: [
          {
            id: 'cmsg_1',
            senderId: 'usr_2',
            senderType: 'client',
            content: 'Welcome aboard! Looking forward to working together.',
            createdAt: new Date(Date.now() - 7 * 86_400_000),
          },
          {
            id: 'cmsg_2',
            senderId: 'agt_3',
            senderType: 'agent',
            content: "Thanks! I've reviewed the requirements. Starting with the schema design today.",
            createdAt: new Date(Date.now() - 7 * 86_400_000 + 3_600_000),
          },
          {
            id: 'cmsg_3',
            senderId: 'agt_3',
            senderType: 'agent',
            content: 'Milestone 1 completed. Schema ERD and pipeline architecture doc attached.',
            createdAt: new Date(Date.now() - 5 * 86_400_000),
          },
        ],
      },
    },
    update: {},
  });

  await prisma.contract.upsert({
    where: { id: 'ctr_2' },
    create: {
      id: 'ctr_2',
      tenantId: 'ten_3',
      agentId: 'agt_7',
      clientUserId: 'usr_1',
      title: 'Multi-cloud migration strategy',
      description: 'Design and execute migration of legacy on-prem workloads to a multi-cloud (AWS + Azure) architecture.',
      specialty: 'cloud-architecture',
      status: 'active',
      hourlyRate: 130,
      estimatedHours: 120,
      actualHours: 56,
      totalCost: 7280,
      startedAt: new Date(Date.now() - 21 * 86_400_000),
      createdAt: new Date(Date.now() - 22 * 86_400_000),
      milestones: {
        create: [
          {
            id: 'ms_4',
            title: 'Discovery & assessment',
            description: 'Audit existing infrastructure and workloads',
            status: 'completed',
            completedAt: new Date(Date.now() - 14 * 86_400_000),
            amount: 2600,
          },
          {
            id: 'ms_5',
            title: 'Architecture blueprint',
            description: 'Design target multi-cloud architecture',
            status: 'completed',
            completedAt: new Date(Date.now() - 7 * 86_400_000),
            amount: 2600,
          },
          {
            id: 'ms_6',
            title: 'Migration execution',
            description: 'Execute phased migration with zero downtime',
            status: 'in-progress',
            amount: 3900,
          },
        ],
      },
      messages: {
        create: [
          {
            id: 'cmsg_4',
            senderId: 'usr_1',
            senderType: 'client',
            content: 'Critical project — we need this done right. Happy to provide any access needed.',
            createdAt: new Date(Date.now() - 21 * 86_400_000),
          },
          {
            id: 'cmsg_5',
            senderId: 'agt_7',
            senderType: 'agent',
            content: "Understood. I'll need VPN access to the on-prem environment first.",
            createdAt: new Date(Date.now() - 21 * 86_400_000 + 1_800_000),
          },
        ],
      },
    },
    update: {},
  });

  await prisma.contract.upsert({
    where: { id: 'ctr_3' },
    create: {
      id: 'ctr_3',
      tenantId: 'ten_1',
      agentId: 'agt_4',
      clientUserId: 'usr_2',
      title: 'Customer portal redesign',
      description: 'Redesign the customer-facing portal with React, improved UX, and full accessibility compliance.',
      specialty: 'frontend',
      status: 'completed',
      hourlyRate: 85,
      estimatedHours: 60,
      actualHours: 55,
      totalCost: 4675,
      rating: 5,
      feedback: 'Exceptional work! Delivered ahead of schedule with pixel-perfect implementation.',
      startedAt: new Date(Date.now() - 40 * 86_400_000),
      completedAt: new Date(Date.now() - 12 * 86_400_000),
      createdAt: new Date(Date.now() - 42 * 86_400_000),
      milestones: {
        create: [
          {
            id: 'ms_7',
            title: 'Design system setup',
            description: 'Create component library and design tokens',
            status: 'completed',
            completedAt: new Date(Date.now() - 30 * 86_400_000),
            amount: 1700,
          },
          {
            id: 'ms_8',
            title: 'Core pages',
            description: 'Implement dashboard, profile, and settings',
            status: 'completed',
            completedAt: new Date(Date.now() - 20 * 86_400_000),
            amount: 1700,
          },
          {
            id: 'ms_9',
            title: 'Accessibility audit',
            description: 'WCAG 2.1 AA compliance pass',
            status: 'completed',
            completedAt: new Date(Date.now() - 12 * 86_400_000),
            amount: 1275,
          },
        ],
      },
    },
    update: {},
  });

  // ── Approval Requests ────────────────────────────────────────────

  await prisma.approvalRequest.upsert({
    where: { id: 'apr_1' },
    create: {
      id: 'apr_1',
      action: 'restart_service',
      description: 'Restart the payment-gateway service on prod-cluster-01',
      risk: 'high',
      reversible: true,
      context: { service: 'payment-gateway', cluster: 'prod-cluster-01' },
      requestedAt: new Date(Date.now() - 300_000),
      status: 'pending',
    },
    update: {},
  });

  // ── Workflow Runs ────────────────────────────────────────────────

  const now = new Date();

  // Run 1: Incident response — completed
  await prisma.workflowRun.upsert({
    where: { id: 'wfr_1' },
    create: {
      id: 'wfr_1',
      workflowId: 'incident-response',
      workflowName: 'Incident Response Pipeline',
      task: 'Production API returning 500 errors on /api/payments endpoint since 14:30 UTC',
      status: 'completed',
      variables: {
        task: 'Production API returning 500 errors',
        root_cause: 'connection pool exhausted',
        severity: 'SEV-2',
      },
      completedAt: new Date(now.getTime() - 600_000),
      createdAt: new Date(now.getTime() - 3_600_000),
      steps: {
        create: [
          { stepId: 'triage', agentId: 'it-ops-specialist', status: 'done', attempts: 1, output: 'Root cause: database connection pool exhausted', startedAt: new Date(now.getTime() - 3_600_000), completedAt: new Date(now.getTime() - 3_300_000) },
          { stepId: 'investigate', agentId: 'bug-triager', status: 'done', attempts: 1, output: 'Connection leak in PaymentService.processRefund()', startedAt: new Date(now.getTime() - 3_300_000), completedAt: new Date(now.getTime() - 2_700_000) },
          { stepId: 'fix', agentId: 'it-ops-specialist', status: 'done', attempts: 2, output: 'Fixed connection leak, added pool health check', startedAt: new Date(now.getTime() - 2_700_000), completedAt: new Date(now.getTime() - 1_800_000) },
          { stepId: 'verify', agentId: 'code-reviewer', status: 'done', attempts: 1, output: 'Fix verified, no regressions found', startedAt: new Date(now.getTime() - 1_800_000), completedAt: new Date(now.getTime() - 1_200_000) },
          { stepId: 'review', agentId: 'code-reviewer', status: 'done', attempts: 1, output: 'PR approved, ready to merge', startedAt: new Date(now.getTime() - 1_200_000), completedAt: new Date(now.getTime() - 600_000) },
        ],
      },
    },
    update: {},
  });

  // Run 2: Security audit — running
  await prisma.workflowRun.upsert({
    where: { id: 'wfr_2' },
    create: {
      id: 'wfr_2',
      workflowId: 'security-audit',
      workflowName: 'Security Audit Pipeline',
      task: 'Quarterly security audit for payment microservices',
      status: 'running',
      variables: {
        task: 'Quarterly security audit',
        vulnerabilities_critical: '3',
        vulnerabilities_high: '12',
      },
      createdAt: new Date(now.getTime() - 7_200_000),
      steps: {
        create: [
          { stepId: 'scan', agentId: 'security-auditor', status: 'done', attempts: 1, output: 'Found 3 critical, 12 high, 28 medium vulnerabilities', startedAt: new Date(now.getTime() - 7_200_000), completedAt: new Date(now.getTime() - 5_400_000) },
          { stepId: 'prioritize', agentId: 'security-auditor', status: 'done', attempts: 1, output: 'Prioritized: 3 critical CVEs for immediate fix', startedAt: new Date(now.getTime() - 5_400_000), completedAt: new Date(now.getTime() - 4_200_000) },
          { stepId: 'fix', agentId: 'security-auditor', status: 'running', attempts: 1, startedAt: new Date(now.getTime() - 4_200_000) },
          { stepId: 'verify', agentId: 'code-reviewer', status: 'pending', attempts: 0 },
          { stepId: 'test', agentId: 'code-reviewer', status: 'pending', attempts: 0 },
          { stepId: 'report', agentId: 'code-reviewer', status: 'pending', attempts: 0 },
        ],
      },
    },
    update: {},
  });

  // Run 3: Change management — escalated
  await prisma.workflowRun.upsert({
    where: { id: 'wfr_3' },
    create: {
      id: 'wfr_3',
      workflowId: 'change-management',
      workflowName: 'Change Management Pipeline',
      task: 'Upgrade Kubernetes cluster from 1.28 to 1.30',
      status: 'escalated',
      variables: { task: 'K8s upgrade 1.28→1.30', change_type: 'major', risk_level: 'high' },
      createdAt: new Date(now.getTime() - 86_400_000),
      steps: {
        create: [
          { stepId: 'plan', agentId: 'it-ops-specialist', status: 'done', attempts: 1, output: 'Change plan created with rollback strategy', startedAt: new Date(now.getTime() - 86_400_000), completedAt: new Date(now.getTime() - 82_800_000) },
          { stepId: 'implement', agentId: 'it-ops-specialist', status: 'done', attempts: 1, output: 'Control plane upgraded successfully', startedAt: new Date(now.getTime() - 82_800_000), completedAt: new Date(now.getTime() - 79_200_000) },
          { stepId: 'security-scan', agentId: 'security-auditor', status: 'done', attempts: 1, output: 'No new vulnerabilities introduced', startedAt: new Date(now.getTime() - 79_200_000), completedAt: new Date(now.getTime() - 75_600_000) },
          { stepId: 'review', agentId: 'code-reviewer', status: 'escalated', attempts: 3, error: 'Worker node drain failed on node-pool-3, requires manual intervention', startedAt: new Date(now.getTime() - 75_600_000) },
          { stepId: 'deploy', agentId: 'it-ops-specialist', status: 'pending', attempts: 0 },
        ],
      },
    },
    update: {},
  });

  console.log('✓ Seeded 3 users, 3 tenants, 3 contracts, 1 approval, 3 workflow runs');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
