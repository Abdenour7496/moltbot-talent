import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import { requireAuth } from './auth.js';
import dashboardRoutes from './routes/dashboard.js';
import personaRoutes from './routes/personas.js';
import knowledgeRoutes from './routes/knowledge.js';
import approvalRoutes from './routes/approvals.js';
import auditRoutes from './routes/audit.js';
import integrationRoutes from './routes/integrations.js';
import sessionRoutes from './routes/sessions.js';
import channelRoutes from './routes/channels.js';
import hookRoutes from './routes/hooks.js';
import commsRoutes from './routes/comms.js';
import healthRoutes from './routes/health.js';
import cronRoutes from './routes/cron.js';
import brainRoutes from './routes/brains.js';
import agentBrainRoutes from './routes/agent-brains.js';
import skillRoutes from './routes/skills.js';
import securityRoutes from './routes/security.js';
import usageRoutes from './routes/usage.js';
import webhookRoutes from './routes/webhooks.js';
import gatewayRoutes from './routes/gateway.js';
import marketplaceRoutes from './routes/marketplace.js';
import agentsRoutes from './routes/agents.js';
import contractRoutes from './routes/contracts.js';
import tenantRoutes from './routes/tenants.js';
import azureKnowledgeBasesRoutes from './routes/azure-knowledge-bases.js';
import azureKnowledgeSourcesRoutes from './routes/azure-knowledge-sources.js';
import orgoRoutes from './routes/orgo.js';
import workflowRunRoutes from './routes/workflow-runs.js';
import orgPortalRoutes from './routes/org-portal.js';
import { initGateway } from './gateway.js';
import { settings } from './state.js';
import { connectDB } from './db/index.js';
import { connectRedis } from './db/index.js';

async function main() {
  // Connect to persistent stores before starting the server
  await connectDB();
  await connectRedis();

  const app = express();
  const PORT = parseInt(process.env.PORT ?? '3001', 10);

  // Safety check: warn loudly if the default insecure JWT secret is in use
  if (!process.env.JWT_SECRET) {
    console.warn(
      '\n⚠️  WARNING: JWT_SECRET env var is not set. Using insecure default secret.\n' +
        '   Set JWT_SECRET to a long random string before deploying to production.\n',
    );
  }

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Public routes (no auth required)
  app.use('/api/auth', authRoutes);
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Auth middleware — all routes below require a valid token
  app.use('/api', requireAuth);

  // Protected routes
  app.use('/api/users', userRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/personas', personaRoutes);
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/approvals', approvalRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/integrations', integrationRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api/hooks', hookRoutes);
  app.use('/api/comms', commsRoutes);
  app.use('/api/health/details', healthRoutes);
  app.use('/api/cron', cronRoutes);
  app.use('/api/personas/:personaId/brain', brainRoutes);
  app.use('/api/agents/:agentId/brain', agentBrainRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/usage', usageRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/gateway', gatewayRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/agents', agentsRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/azure/knowledge-bases', azureKnowledgeBasesRoutes);
  app.use('/api/azure/knowledge-sources', azureKnowledgeSourcesRoutes);
  app.use('/api/orgo', orgoRoutes);
  app.use('/api/org', orgPortalRoutes);
  app.use('/api/workflow-runs', workflowRunRoutes);

  // Settings endpoints (inline - small enough)
  app.get('/api/settings', (_req, res) => {
    res.json(settings);
  });

  app.put('/api/settings', (req, res) => {
    if (typeof req.body !== 'object' || req.body === null) {
      res.status(400).json({ error: 'Request body must be an object' });
      return;
    }
    Object.assign(settings, req.body);
    res.json(settings);
  });

  app.patch('/api/settings', (req, res) => {
    if (typeof req.body !== 'object' || req.body === null) {
      res.status(400).json({ error: 'Request body must be an object' });
      return;
    }
    Object.assign(settings, req.body);
    res.json(settings);
  });

  // Global error handler (catches async errors propagated by Express 5)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[error]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Create HTTP server and attach WebSocket gateway
  const server = createServer(app);
  initGateway(server);

  server.listen(PORT, () => {
    console.log(`GUI API server listening on http://localhost:${PORT}`);
    console.log(`WebSocket Gateway available at ws://localhost:${PORT}/ws`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
