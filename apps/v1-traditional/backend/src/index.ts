import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './routes/auth.js';
import { filingsRouter } from './routes/filings.js';
import { approvalsRouter } from './routes/approvals.js';
import { mockRouter } from './routes/mock.js';
import { dashboardRouter } from './routes/dashboard.js';

const app = new Hono();

// 中间件
app.use('/*', cors());
app.use('/*', logger());

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
});

// 路由挂载
app.route('/api/auth', auth);
app.route('/api/filings', filingsRouter);
app.route('/api/approvals', approvalsRouter);
app.route('/api/mock', mockRouter);
app.route('/api/dashboard', dashboardRouter);

// 启动
const port = Number(process.env.PORT ?? 3101);

console.log(`V1 Traditional Backend starting on port ${port}...`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`V1 Traditional Backend running at http://localhost:${info.port}`);
});
