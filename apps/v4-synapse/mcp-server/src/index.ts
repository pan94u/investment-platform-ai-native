import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { securityMiddleware } from './middleware/security.js';
import { auth } from './routes/auth.js';
import { filingsRouter } from './routes/filings.js';
import { approvalsRouter } from './routes/approvals.js';
import { dashboardRouter } from './routes/dashboard.js';
import { mcpRouter } from './routes/mcp.js';
import { securityRouter } from './routes/security.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// 全局中间件
// ---------------------------------------------------------------------------

app.use('/*', cors());
app.use('/*', logger());

// 安全中间件：对所有 POST/PUT/PATCH 请求进行输入净化
// 注意：放在 auth 之前，因为 security middleware 不依赖 user 上下文（可选使用）
app.use('/*', securityMiddleware);

// ---------------------------------------------------------------------------
// 健康检查
// ---------------------------------------------------------------------------

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '4.0.0',
    variant: 'synapse-mcp',
    timestamp: new Date().toISOString(),
    database: 'connected',
    features: [
      'F4.1-输入净化(Prompt Injection 防御)',
      'F4.2-输出校验',
      'F4.3-权限守卫(RBAC)',
      'F4.4-安全审计日志',
      'F4.5-人机边界',
      'F4.6-风险评估透明度',
      'MCP工具集(10个)',
      'Persona角色管理(3个)',
      '合规规则引擎(Pre/Post-Hook)',
    ],
  });
});

// ---------------------------------------------------------------------------
// 路由挂载
// ---------------------------------------------------------------------------

app.route('/api/auth', auth);
app.route('/api/filings', filingsRouter);
app.route('/api/approvals', approvalsRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/mcp', mcpRouter);
app.route('/api/security', securityRouter);

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------

const port = Number(process.env.PORT ?? 3006);

console.log(`V4 Synapse MCP Server starting on port ${port}...`);
console.log('Security features: Input Sanitization | Output Validation | RBAC | Audit Log | Human Boundary | Risk Transparency');

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`V4 Synapse MCP Server running at http://localhost:${info.port}`);
});
