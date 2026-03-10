import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './routes/auth.js';
import { filingsRouter } from './routes/filings.js';
import { approvalsRouter } from './routes/approvals.js';
import { insightsRouter } from './routes/insights.js';
import { mockRouter } from './routes/mock.js';

const app = new Hono();

// 中间件
app.use('/*', cors());
app.use('/*', logger());

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '3.0.0',
    variant: 'insights',
    timestamp: new Date().toISOString(),
    database: 'connected',
    features: [
      'proactive-insights',
      'analytics-dashboard',
      'conversational-query',
      'baseline-warnings',
      'anomaly-detection',
      'trend-analysis',
      'periodic-reports',
    ],
  });
});

// 路由挂载
app.route('/api/auth', auth);
app.route('/api/filings', filingsRouter);
app.route('/api/approvals', approvalsRouter);
app.route('/api/insights', insightsRouter);
app.route('/api/mock', mockRouter);

// 启动
const port = Number(process.env.PORT ?? 3104);

console.log(`V3 Insights Backend starting on port ${port}...`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`V3 Insights Backend running at http://localhost:${info.port}`);
});
