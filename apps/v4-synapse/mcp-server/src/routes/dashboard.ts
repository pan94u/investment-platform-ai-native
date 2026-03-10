import { Hono } from 'hono';
import { sql, count } from 'drizzle-orm';
import { filings } from '@filing/database';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../lib/db.js';

const dashboardRouter = new Hono<AppEnv>();

dashboardRouter.use('/*', authMiddleware);

/** GET /api/dashboard/stats — 看板统计 */
dashboardRouter.get('/stats', async (c) => {
  const [statusCounts, typeCounts, domainCounts, totalAmount, riskCounts] = await Promise.all([
    db.select({ status: filings.status, cnt: count() }).from(filings).groupBy(filings.status),
    db.select({ type: filings.type, cnt: count() }).from(filings).groupBy(filings.type),
    db.select({ domain: filings.domain, cnt: count() }).from(filings).groupBy(filings.domain),
    db.select({ total: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text` }).from(filings),
    db.select({ riskLevel: filings.riskLevel, cnt: count() }).from(filings).groupBy(filings.riskLevel),
  ]);

  return c.json({
    success: true,
    data: {
      byStatus: statusCounts,
      byType: typeCounts,
      byDomain: domainCounts,
      byRiskLevel: riskCounts,
      totalAmount: totalAmount[0]?.total ?? '0',
      totalCount: statusCounts.reduce((sum: number, s: { status: string; cnt: number }) => sum + s.cnt, 0),
    },
    error: null,
  });
});

export { dashboardRouter };
