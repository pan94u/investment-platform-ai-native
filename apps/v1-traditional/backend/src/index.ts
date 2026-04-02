import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './routes/auth.js';
import { filingsRouter } from './routes/filings.js';
import { approvalsRouter } from './routes/approvals.js';
import { attachmentsRouter } from './routes/attachments.js';
import { adminRouter } from './routes/admin.js';
import { strategicRouter } from './routes/strategic.js';
import { mockRouter } from './routes/mock.js';
import { dashboardRouter } from './routes/dashboard.js';
import { webhooksRouter } from './routes/webhooks.js';
import { mcpRouter } from './routes/mcp.js';

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
app.route('/api', attachmentsRouter);          // /api/filings/:id/attachments + /api/attachments/:id/*
app.route('/api/admin', adminRouter);
app.route('/api/strategic', strategicRouter);
app.route('/api/mock', mockRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/api/mcp', mcpRouter);

// 启动
const port = Number(process.env.PORT ?? 3101);

console.log(`V1 Traditional Backend starting on port ${port}...`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`V1 Traditional Backend running at http://localhost:${info.port}`);
});
