import { Router } from 'express';
import {
  personas,
  knowledgeBases,
  sessions,
  channels,
  hooks,
  cronTasks,
  integrations,
} from '../state.js';
import { prisma } from '../db/index.js';

const router = Router();

type ComponentStatus = 'healthy' | 'degraded' | 'down';

interface ComponentHealth {
  name: string;
  status: ComponentStatus;
  details: string;
  latency?: number;
}

router.get('/', async (_req, res) => {
  const start = Date.now();

  const components: ComponentHealth[] = [
    {
      name: 'API Server',
      status: 'healthy',
      details: `Uptime ${Math.floor(process.uptime())}s`,
      latency: 1,
    },
    {
      name: 'Personas',
      status: personas.size > 0 ? 'healthy' : 'degraded',
      details: `${personas.size} loaded, ${Array.from(personas.values()).filter((p) => p.active).length} active`,
    },
    {
      name: 'Knowledge Bases',
      status: knowledgeBases.size > 0 ? 'healthy' : 'degraded',
      details: `${knowledgeBases.size} available`,
    },
    {
      name: 'Sessions',
      status: 'healthy',
      details: `${sessions.size} total, ${Array.from(sessions.values()).filter((s) => s.status === 'active').length} active`,
    },
    {
      name: 'Channels',
      status: 'healthy',
      details: `${channels.size} configured, ${Array.from(channels.values()).filter((c) => c.active).length} active`,
    },
    {
      name: 'Hooks',
      status: 'healthy',
      details: `${hooks.size} registered, ${Array.from(hooks.values()).filter((h) => h.enabled).length} enabled`,
    },
    {
      name: 'Cron Tasks',
      status: 'healthy',
      details: `${cronTasks.size} tasks, ${Array.from(cronTasks.values()).filter((c) => c.enabled).length} enabled`,
    },
    {
      name: 'Integrations',
      status: Array.from(integrations.values()).some((i) => i.connected) ? 'healthy' : 'degraded',
      details: `${integrations.size} configured, ${Array.from(integrations.values()).filter((i) => i.connected).length} connected`,
    },
    {
      name: 'Audit Log',
      status: 'healthy',
      details: `${await prisma.auditEntry.count()} entries`,
    },
  ];

  const overall: ComponentStatus = components.some((c) => c.status === 'down')
    ? 'down'
    : components.some((c) => c.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  res.json({
    status: overall,
    uptime: process.uptime(),
    timestamp: new Date(),
    responseTime: Date.now() - start,
    components,
  });
});

export default router;
