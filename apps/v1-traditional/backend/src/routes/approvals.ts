import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/require-role.js';
import * as approvalService from '../services/approval.js';

const approvalsRouter = new Hono<AppEnv>();

approvalsRouter.use('/*', authMiddleware);

/** GET /api/approvals/todos — 获取待审批列表（admin 可见全部） */
approvalsRouter.get('/todos', async (c) => {
  const user = c.get('user');
  const todos = await approvalService.getApprovalTodos(user.id, user.role === 'admin');
  return c.json({ success: true, data: todos, error: null });
});

/** GET /api/approvals/todos/:id — 获取单条待办（移动端 / 飞书机器人 deep link）
 *
 * 不限制 status='pending'，已处理也返回数据让前端展示「已处理」状态。
 */
approvalsRouter.get('/todos/:id', async (c) => {
  const user = c.get('user');
  const todo = await approvalService.getApprovalTodoById(
    c.req.param('id'),
    user.id,
    user.role === 'admin',
  );
  if (!todo) {
    return c.json({ success: false, data: null, error: '待办不存在或无权查看' }, 404);
  }
  return c.json({ success: true, data: todo, error: null });
});

/** GET /api/approvals/history/:filingId — 获取审批历史 */
approvalsRouter.get('/history/:filingId', async (c) => {
  const history = await approvalService.getApprovalHistory(c.req.param('filingId'));
  return c.json({ success: true, data: history, error: null });
});

/** POST /api/approvals/:id/approve — 同意 */
approvalsRouter.post('/:id/approve', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    comment?: string;
    skipEmail?: boolean;
    emailOverrides?: { to?: string[]; cc?: string[]; subject?: string };
  }>().catch(() => ({}) as { comment?: string; skipEmail?: boolean; emailOverrides?: { to?: string[]; cc?: string[]; subject?: string } });

  try {
    const emailOptions = (body.skipEmail !== undefined || body.emailOverrides)
      ? { skipEmail: body.skipEmail, emailOverrides: body.emailOverrides }
      : undefined;
    const result = await approvalService.processApproval(c.req.param('id'), user.id, 'approve', body.comment, user.name, emailOptions);
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
    const result = await approvalService.processApproval(c.req.param('id'), user.id, 'reject', body.comment, user.name);
    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '驳回失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** POST /api/approvals/:id/acknowledge — 知悉 */
approvalsRouter.post('/:id/acknowledge', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ comment?: string }>().catch(() => ({} as { comment?: string }));

  try {
    const result = await approvalService.processApproval(c.req.param('id'), user.id, 'acknowledge', body.comment, user.name);
    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '知悉操作失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** PUT /api/approvals/:id/reassign — 管理员改派 */
approvalsRouter.put('/:id/reassign', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ newApproverId: string; reason?: string }>();

  if (!body.newApproverId) {
    return c.json({ success: false, data: null, error: '缺少新审批人 ID' }, 400);
  }

  try {
    const result = await approvalService.reassignApproval(
      c.req.param('id'), user.id, user.name, body.newApproverId, body.reason,
    );
    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '改派失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** POST /api/approvals/batch-approve — 批量审批 */
approvalsRouter.post('/batch-approve', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ approvalIds: string[]; comment?: string }>();

  if (!body.approvalIds?.length) {
    return c.json({ success: false, data: null, error: '缺少审批 ID 列表' }, 400);
  }

  try {
    const result = await approvalService.batchApprove(body.approvalIds, user.id, user.name, body.comment);
    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '批量审批失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

export { approvalsRouter };
