import { Hono } from 'hono';
import type { CreateFilingRequest, UpdateFilingRequest, FilingQueryParams } from '@filing/shared';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import * as filingService from '../services/filing.js';
import * as auditService from '../services/audit.js';

const filingsRouter = new Hono<AppEnv>();

filingsRouter.use('/*', authMiddleware);

/** POST /api/filings — 创建备案 */
filingsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<CreateFilingRequest>();

  if (!body.type || !body.title || !body.projectName || !body.domain || !body.industry || body.amount == null) {
    return c.json({ success: false, data: null, error: '缺少必填字段' }, 400);
  }

  const filing = await filingService.createFiling(body, user.id);

  await auditService.logAudit({
    action: 'filing_created',
    entityType: 'filing',
    entityId: filing.id,
    userId: user.id,
    userName: user.name,
    detail: { type: body.type, title: body.title, amount: body.amount },
  });

  return c.json({ success: true, data: filing, error: null }, 201);
});

/** GET /api/filings — 查询备案列表 */
filingsRouter.get('/', async (c) => {
  const params: FilingQueryParams = {
    type: c.req.query('type') as FilingQueryParams['type'],
    status: c.req.query('status') as FilingQueryParams['status'],
    domain: c.req.query('domain') as FilingQueryParams['domain'],
    creatorId: c.req.query('creatorId'),
    dateFrom: c.req.query('dateFrom'),
    dateTo: c.req.query('dateTo'),
    keyword: c.req.query('keyword'),
    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
    pageSize: c.req.query('pageSize') ? Number(c.req.query('pageSize')) : undefined,
  };

  const result = await filingService.queryFilings(params);
  return c.json({ success: true, data: result, error: null });
});

/** GET /api/filings/:id — 获取备案详情 */
filingsRouter.get('/:id', async (c) => {
  const filing = await filingService.getFilingById(c.req.param('id'));
  if (!filing) {
    return c.json({ success: false, data: null, error: '备案不存在' }, 404);
  }
  return c.json({ success: true, data: filing, error: null });
});

/** PUT /api/filings/:id — 更新备案 */
filingsRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<UpdateFilingRequest>();

  try {
    const filing = await filingService.updateFiling(c.req.param('id'), body, user.id);

    await auditService.logAudit({
      action: 'filing_updated',
      entityType: 'filing',
      entityId: filing.id,
      userId: user.id,
      userName: user.name,
      detail: { changes: body },
    });

    return c.json({ success: true, data: filing, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** POST /api/filings/:id/submit — 提交备案 */
filingsRouter.post('/:id/submit', async (c) => {
  const user = c.get('user');

  try {
    const filing = await filingService.submitFiling(c.req.param('id'), user.id);

    await auditService.logAudit({
      action: 'filing_submitted',
      entityType: 'filing',
      entityId: filing.id,
      userId: user.id,
      userName: user.name,
    });

    return c.json({ success: true, data: filing, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** GET /api/filings/:id/audit-logs — 获取审计日志 */
filingsRouter.get('/:id/audit-logs', async (c) => {
  const logs = await auditService.getAuditLogs('filing', c.req.param('id'));
  return c.json({ success: true, data: logs, error: null });
});

export { filingsRouter };
