import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './routes/auth.js';
import { filingsRouter } from './routes/filings.js';
import { approvalsRouter } from './routes/approvals.js';
import { aiRouter } from './routes/ai.js';
import { dashboardRouter } from './routes/dashboard.js';
import { mockRouter } from './routes/mock.js';

const app = new Hono();

// 中间件
app.use('/*', cors());
app.use('/*', logger());

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '2.0.0-poc',
    variant: 'ai-native',
    timestamp: new Date().toISOString(),
    database: 'connected',
    features: [
      'conversational-filing',
      'document-extraction',
      'risk-assessment',
      'approval-summary',
      'baseline-check',
      'data-query',
    ],
  });
});

// 路由挂载
app.route('/api/auth', auth);
app.route('/api/filings', filingsRouter);
app.route('/api/approvals', approvalsRouter);
app.route('/api/ai', aiRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/mock', mockRouter);

// 启动
const port = Number(process.env.PORT ?? 3002);

console.log(`V2 AI-Native Backend starting on port ${port}...`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`V2 AI-Native Backend running at http://localhost:${info.port}`);
  console.log('AI features: conversational filing, doc extraction, risk assessment, approval summary');
});
