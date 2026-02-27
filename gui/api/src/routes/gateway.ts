import { Router } from 'express';
import { getGatewayStatus } from '../gateway.js';

const router = Router();

// Get gateway status
router.get('/', (_req, res) => {
  const status = getGatewayStatus();
  res.json({
    ...status,
    uptime: process.uptime(),
    version: '0.1.0',
    port: parseInt(process.env.PORT ?? '3001', 10),
    wsPath: '/ws',
  });
});

export default router;
