import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  getSecurityLog,
  sanitizeInput,
  checkPermission,
  getRiskAssessmentAudit,
  logSecurityEvent,
} from '../middleware/security.js';
import { db } from '../lib/db.js';
import { filings } from '@filing/database';
import { eq } from 'drizzle-orm';

const securityRouter = new Hono<AppEnv>();

securityRouter.use('/*', authMiddleware);

/**
 * GET /api/security/audit-log — 获取安全审计日志（仅 admin）
 */
securityRouter.get('/audit-log', async (c) => {
  const user = c.get('user');

  if (user.role !== 'admin') {
    return c.json({ success: false, data: null, error: '仅管理员可查看安全审计日志' }, 403);
  }

  const userId = c.req.query('userId');
  const type = c.req.query('type') as 'ai_input' | 'ai_output' | 'permission_check' | 'data_access' | undefined;
  const action = c.req.query('action');
  const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 100;

  const logs = getSecurityLog({ userId, type, action, limit });

  return c.json({
    success: true,
    data: {
      logs,
      total: logs.length,
      filters: { userId, type, action, limit },
    },
    error: null,
  });
});

/**
 * POST /api/security/check-input — 测试输入净化
 */
securityRouter.post('/check-input', async (c) => {
  const user = c.get('user');
  const { input } = await c.req.json<{ input: string }>();

  if (!input) {
    return c.json({ success: false, data: null, error: '缺少 input 参数' }, 400);
  }

  const result = sanitizeInput(input);

  logSecurityEvent({
    type: 'ai_input',
    userId: user.id,
    action: 'security_check_input',
    input: input.substring(0, 500),
    sanitized: result.threats.length > 0,
    allowed: true,
    reason: result.threats.length > 0
      ? `检测到 ${result.threats.length} 个威胁`
      : '输入安全',
  });

  return c.json({
    success: true,
    data: {
      original: input,
      sanitized: result.sanitized,
      threats: result.threats,
      threatCount: result.threats.length,
      safe: result.threats.length === 0,
    },
    error: null,
  });
});

/**
 * POST /api/security/check-permission — 测试权限检查
 */
securityRouter.post('/check-permission', async (c) => {
  const user = c.get('user');
  const { action, resourceId } = await c.req.json<{ action: string; resourceId?: string }>();

  if (!action) {
    return c.json({ success: false, data: null, error: '缺少 action 参数' }, 400);
  }

  const result = checkPermission(user.id, user.role, action, resourceId);

  logSecurityEvent({
    type: 'permission_check',
    userId: user.id,
    action,
    sanitized: false,
    allowed: result.allowed,
    reason: result.reason,
  });

  return c.json({
    success: true,
    data: {
      userId: user.id,
      role: user.role,
      action,
      resourceId,
      ...result,
    },
    error: null,
  });
});

/**
 * GET /api/security/risk-audit/:filingId — 风险评估透明度审计
 */
securityRouter.get('/risk-audit/:filingId', async (c) => {
  const user = c.get('user');
  const filingId = c.req.param('filingId');

  const result = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (result.length === 0) {
    return c.json({ success: false, data: null, error: '备案不存在' }, 404);
  }

  const filing = result[0];
  const audit = getRiskAssessmentAudit({
    amount: filing.amount,
    type: filing.type,
    domain: filing.domain,
    industry: filing.industry,
    investmentRatio: filing.investmentRatio,
  });

  logSecurityEvent({
    type: 'data_access',
    userId: user.id,
    action: 'risk_audit_view',
    output: `查看备案 ${filingId} 的风险审计`,
    sanitized: false,
    allowed: true,
  });

  return c.json({
    success: true,
    data: {
      filingId,
      filingNumber: filing.filingNumber,
      title: filing.title,
      currentRiskLevel: filing.riskLevel,
      assessment: audit,
    },
    error: null,
  });
});

export { securityRouter };
