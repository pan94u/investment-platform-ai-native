import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import * as filingService from '../services/filing.js';

const dashboardRouter = new Hono<AppEnv>();

dashboardRouter.use('/*', authMiddleware);

/** GET /api/dashboard/stats — 看板统计 */
dashboardRouter.get('/stats', async (c) => {
  const stats = await filingService.getDashboardStats();
  return c.json({ success: true, data: stats, error: null });
});

export { dashboardRouter };
