import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { approvals, filings, users, auditLogs } from '@filing/database';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';
import {
  checkPermission,
  enforceHumanBoundary,
  logSecurityEvent,
} from '../middleware/security.js';
import { runPostHooks } from '../rules/compliance-rules.js';

const approvalsRouter = new Hono<AppEnv>();

approvalsRouter.use('/*', authMiddleware);

// ---------------------------------------------------------------------------
// Helper: audit log
// ---------------------------------------------------------------------------

async function logAudit(params: {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  detail?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id: generateId('audit'),
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    userId: params.userId,
    userName: params.userName,
    detail: params.detail ?? {},
  });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET /api/approvals/todos — 获取待审批列表 */
approvalsRouter.get('/todos', async (c) => {
  const user = c.get('user');

  const todos = await db
    .select({
      approvalId: approvals.id,
      filingId: approvals.filingId,
      filingNumber: filings.filingNumber,
      filingTitle: filings.title,
      filingType: filings.type,
      creatorName: users.name,
      domain: filings.domain,
      amount: filings.amount,
      level: approvals.level,
      submittedAt: filings.submittedAt,
    })
    .from(approvals)
    .innerJoin(filings, eq(approvals.filingId, filings.id))
    .innerJoin(users, eq(filings.creatorId, users.id))
    .where(and(eq(approvals.approverId, user.id), eq(approvals.status, 'pending')))
    .orderBy(desc(filings.submittedAt));

  return c.json({ success: true, data: todos, error: null });
});

/** GET /api/approvals/history/:filingId — 获取审批历史 */
approvalsRouter.get('/history/:filingId', async (c) => {
  const history = await db
    .select()
    .from(approvals)
    .where(eq(approvals.filingId, c.req.param('filingId')))
    .orderBy(approvals.level);

  return c.json({ success: true, data: history, error: null });
});

/** POST /api/approvals/:id/approve — 同意 */
approvalsRouter.post('/:id/approve', async (c) => {
  const user = c.get('user');

  // 权限检查
  const perm = checkPermission(user.id, user.role, 'approval_approve');
  if (!perm.allowed) {
    return c.json({ success: false, data: null, error: `权限不足: ${perm.reason}` }, 403);
  }

  // 人机边界检查 — REST API 由人类直接调用，视为已确认
  const boundary = enforceHumanBoundary('approval_approve');
  logSecurityEvent({
    type: 'data_access',
    userId: user.id,
    action: 'approval_approve',
    sanitized: false,
    allowed: true,
    reason: boundary.requiresHuman ? '人工操作 — 已通过 REST API 确认' : undefined,
  });

  const body = await c.req.json<{ comment?: string }>().catch(() => ({} as { comment?: string }));
  const approvalId = c.req.param('id');

  // 验证审批记录
  const existing = await db.select().from(approvals).where(eq(approvals.id, approvalId)).limit(1);
  if (existing.length === 0) {
    return c.json({ success: false, data: null, error: '审批记录不存在' }, 404);
  }
  if (existing[0].approverId !== user.id) {
    return c.json({ success: false, data: null, error: '无权处理此审批' }, 403);
  }
  if (existing[0].status !== 'pending') {
    return c.json({ success: false, data: null, error: '此审批已处理' }, 400);
  }

  const approval = existing[0];
  const now = new Date();

  // 更新审批状态
  await db.update(approvals).set({
    status: 'approved',
    comment: body.comment ?? null,
    decidedAt: now,
  }).where(eq(approvals.id, approvalId));

  let newStatus: string;

  if (approval.level === 1) {
    // 一级通过 → 创建二级审批
    const groupApprovers = await db.select().from(users).where(eq(users.role, 'group_approver'));
    if (groupApprovers.length === 0) {
      return c.json({ success: false, data: null, error: '未找到集团审批人' }, 500);
    }

    await db.insert(approvals).values({
      id: generateId('approval'),
      filingId: approval.filingId,
      approverId: groupApprovers[0].id,
      approverName: groupApprovers[0].name,
      stage: 'group',
      level: 2,
      status: 'pending',
    });

    await db.update(filings).set({
      status: 'pending_group',
      updatedAt: now,
    }).where(eq(filings.id, approval.filingId));

    newStatus = 'pending_group';
  } else {
    // 二级通过 → 备案完成
    await db.update(filings).set({
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    }).where(eq(filings.id, approval.filingId));

    newStatus = 'completed';
  }

  await logAudit({
    action: 'filing_approved',
    entityType: 'approval',
    entityId: approvalId,
    userId: user.id,
    userName: user.name,
    detail: { comment: body.comment, level: approval.level },
  });

  // Post-hook
  runPostHooks('approval_approve', {
    filingId: approval.filingId,
    userId: user.id,
    level: approval.level,
    comment: body.comment,
  });

  return c.json({ success: true, data: { status: newStatus }, error: null });
});

/** POST /api/approvals/:id/reject — 驳回 */
approvalsRouter.post('/:id/reject', async (c) => {
  const user = c.get('user');

  // 权限检查
  const perm = checkPermission(user.id, user.role, 'approval_reject');
  if (!perm.allowed) {
    return c.json({ success: false, data: null, error: `权限不足: ${perm.reason}` }, 403);
  }

  // 人机边界检查
  const boundary = enforceHumanBoundary('approval_reject');
  logSecurityEvent({
    type: 'data_access',
    userId: user.id,
    action: 'approval_reject',
    sanitized: false,
    allowed: true,
    reason: boundary.requiresHuman ? '人工操作 — 已通过 REST API 确认' : undefined,
  });

  const body = await c.req.json<{ comment?: string }>().catch(() => ({} as { comment?: string }));
  const approvalId = c.req.param('id');

  const existing = await db.select().from(approvals).where(eq(approvals.id, approvalId)).limit(1);
  if (existing.length === 0) {
    return c.json({ success: false, data: null, error: '审批记录不存在' }, 404);
  }
  if (existing[0].approverId !== user.id) {
    return c.json({ success: false, data: null, error: '无权处理此审批' }, 403);
  }
  if (existing[0].status !== 'pending') {
    return c.json({ success: false, data: null, error: '此审批已处理' }, 400);
  }

  const approval = existing[0];
  const now = new Date();

  await db.update(approvals).set({
    status: 'rejected',
    comment: body.comment ?? null,
    decidedAt: now,
  }).where(eq(approvals.id, approvalId));

  await db.update(filings).set({
    status: 'rejected',
    updatedAt: now,
  }).where(eq(filings.id, approval.filingId));

  await logAudit({
    action: 'filing_rejected',
    entityType: 'approval',
    entityId: approvalId,
    userId: user.id,
    userName: user.name,
    detail: { comment: body.comment, level: approval.level },
  });

  // Post-hook
  runPostHooks('approval_reject', {
    filingId: approval.filingId,
    userId: user.id,
    level: approval.level,
    comment: body.comment,
  });

  return c.json({ success: true, data: { status: 'rejected' }, error: null });
});

export { approvalsRouter };
