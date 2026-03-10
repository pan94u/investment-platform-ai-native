import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import * as approvalService from '../services/approval.js';
import * as auditService from '../services/audit.js';

const approvalsRouter = new Hono<AppEnv>();

approvalsRouter.use('/*', authMiddleware);

/** GET /api/approvals/todos — 获取待审批列表 */
approvalsRouter.get('/todos', async (c) => {
  const user = c.get('user');
  const todos = await approvalService.getApprovalTodos(user.id);
  return c.json({ success: true, data: todos, error: null });
});

/** GET /api/approvals/history/:filingId — 获取审批历史 */
approvalsRouter.get('/history/:filingId', async (c) => {
  const history = await approvalService.getApprovalHistory(c.req.param('filingId'));
  return c.json({ success: true, data: history, error: null });
});

/** POST /api/approvals/:id/approve — 同意 */
approvalsRouter.post('/:id/approve', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ comment?: string }>().catch(() => ({} as { comment?: string }));

  try {
    const result = await approvalService.processApproval(c.req.param('id'), user.id, 'approve', body.comment);

    await auditService.logAudit({
      action: 'filing_approved',
      entityType: 'approval',
      entityId: c.req.param('id'),
      userId: user.id,
      userName: user.name,
      detail: { comment: body.comment },
    });

    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '审批失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** POST /api/approvals/:id/reject — 驳回 */
approvalsRouter.post('/:id/reject', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ comment?: string }>().catch(() => ({} as { comment?: string }));

  try {
    const result = await approvalService.processApproval(c.req.param('id'), user.id, 'reject', body.comment);

    await auditService.logAudit({
      action: 'filing_rejected',
      entityType: 'approval',
      entityId: c.req.param('id'),
      userId: user.id,
      userName: user.name,
      detail: { comment: body.comment },
    });

    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '驳回失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** GET /api/approvals/:id/context-snapshot — 查看审批上下文快照 */
approvalsRouter.get('/:id/context-snapshot', async (c) => {
  const snapshot = approvalService.getContextSnapshot(c.req.param('id'));
  if (!snapshot) {
    return c.json({ success: false, data: null, error: '未找到审批上下文快照' }, 404);
  }
  return c.json({ success: true, data: snapshot, error: null });
});

export { approvalsRouter };
