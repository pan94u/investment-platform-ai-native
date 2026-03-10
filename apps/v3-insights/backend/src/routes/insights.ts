import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import * as analytics from '../services/analytics.js';
import { processQuery } from '../services/query-engine.js';
import { generateWeeklyReport, generateMonthlyReport } from '../services/report-generator.js';

const insightsRouter = new Hono<AppEnv>();

insightsRouter.use('/*', authMiddleware);

/** GET /api/insights/dashboard — 综合看板统计 */
insightsRouter.get('/dashboard', async (c) => {
  try {
    const stats = await analytics.getDashboardStats();
    return c.json({ success: true, data: stats, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取看板数据失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

/** GET /api/insights/trends — 趋势分析 */
insightsRouter.get('/trends', async (c) => {
  try {
    const period = (c.req.query('period') ?? 'monthly') as 'weekly' | 'monthly';
    if (period !== 'weekly' && period !== 'monthly') {
      return c.json({ success: false, data: null, error: 'period 参数只支持 weekly 或 monthly' }, 400);
    }
    const trend = await analytics.getTrendAnalysis(period);
    return c.json({ success: true, data: trend, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取趋势数据失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

/** GET /api/insights/anomalies — 异常检测 */
insightsRouter.get('/anomalies', async (c) => {
  try {
    const result = await analytics.getAnomalyDetection();
    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '异常检测失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

/** GET /api/insights/warnings — 底线预警 */
insightsRouter.get('/warnings', async (c) => {
  try {
    const warnings = await analytics.getBaselineWarnings();
    return c.json({ success: true, data: warnings, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取预警数据失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

/** GET /api/insights/project/:projectName — 项目备案历史 */
insightsRouter.get('/project/:projectName', async (c) => {
  try {
    const projectName = decodeURIComponent(c.req.param('projectName'));
    const history = await analytics.getProjectHistory(projectName);
    return c.json({ success: true, data: history, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取项目历史失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

/** GET /api/insights — 综合洞察（一次性获取所有洞察） */
insightsRouter.get('/', async (c) => {
  try {
    const insights = await analytics.generateInsights();
    return c.json({ success: true, data: insights, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成洞察失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

/** POST /api/insights/query — 对话式数据查询 */
insightsRouter.post('/query', async (c) => {
  try {
    const body = await c.req.json<{ question: string }>();
    if (!body.question || typeof body.question !== 'string') {
      return c.json({ success: false, data: null, error: '请提供查询问题（question 字段）' }, 400);
    }
    const result = await processQuery(body.question.trim());
    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询处理失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

/** GET /api/insights/report/weekly — 生成周报 */
insightsRouter.get('/report/weekly', async (c) => {
  try {
    const report = await generateWeeklyReport();
    return c.json({ success: true, data: report, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成周报失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

/** GET /api/insights/report/monthly — 生成月报 */
insightsRouter.get('/report/monthly', async (c) => {
  try {
    const report = await generateMonthlyReport();
    return c.json({ success: true, data: report, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成月报失败';
    return c.json({ success: false, data: null, error: message }, 500);
  }
});

export { insightsRouter };
