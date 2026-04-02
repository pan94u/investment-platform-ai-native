import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/require-role.js';
import * as adminConfigService from '../services/admin-config.js';

const adminRouter = new Hono<AppEnv>();

adminRouter.use('/*', authMiddleware);
adminRouter.use('/*', requireRole('admin'));

// ─── 审批节点配置 ────────────────────────────────────

/** GET /api/admin/approval-configs — 获取审批配置 */
adminRouter.get('/approval-configs', async (c) => {
  const data = await adminConfigService.getApprovalGroupConfigs();
  return c.json({ success: true, data, error: null });
});

/** POST /api/admin/approval-configs — 新增审批配置 */
adminRouter.post('/approval-configs', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ groupName: string; userId: string; userName: string; userEmail: string }>();

  if (!body.groupName || !body.userName || !body.userEmail) {
    return c.json({ success: false, data: null, error: '缺少必填字段' }, 400);
  }

  try {
    const config = await adminConfigService.upsertApprovalGroupConfig(
      body.groupName, body.userId || '', body.userName, body.userEmail, user.id, user.name,
    );
    return c.json({ success: true, data: config, error: null }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** DELETE /api/admin/approval-configs/:id — 删除审批配置 */
adminRouter.delete('/approval-configs/:id', async (c) => {
  const user = c.get('user');
  try {
    await adminConfigService.removeApprovalGroupConfig(c.req.param('id'), user.id, user.name);
    return c.json({ success: true, data: null, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

// ─── 邮件抄送配置 ────────────────────────────────────

/** GET /api/admin/email-cc-configs — 获取邮件抄送配置 */
adminRouter.get('/email-cc-configs', async (c) => {
  const data = await adminConfigService.getEmailCcConfigs();
  return c.json({ success: true, data, error: null });
});

/** POST /api/admin/email-cc-configs — 新增邮件抄送配置 */
adminRouter.post('/email-cc-configs', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ groupName: string; name: string; email: string }>();

  if (!body.groupName || !body.name || !body.email) {
    return c.json({ success: false, data: null, error: '缺少必填字段' }, 400);
  }

  try {
    const config = await adminConfigService.upsertEmailCcConfig(
      body.groupName, body.name, body.email, user.id, user.name,
    );
    return c.json({ success: true, data: config, error: null }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** DELETE /api/admin/email-cc-configs/:id — 删除邮件抄送配置 */
adminRouter.delete('/email-cc-configs/:id', async (c) => {
  const user = c.get('user');
  try {
    await adminConfigService.removeEmailCcConfig(c.req.param('id'), user.id, user.name);
    return c.json({ success: true, data: null, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

export { adminRouter };
