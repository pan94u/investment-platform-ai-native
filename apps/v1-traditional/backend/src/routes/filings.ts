import { Hono } from 'hono';
import type { CreateFilingRequest, UpdateFilingRequest, FilingQueryParams } from '@filing/shared';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import * as filingService from '../services/filing.js';
import * as auditService from '../services/audit.js';
import * as emailService from '../services/email.js';
import { getOrgProvider } from '../providers/index.js';

const filingsRouter = new Hono<AppEnv>();

filingsRouter.use('/*', authMiddleware);

/** POST /api/filings — 创建备案 */
filingsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<CreateFilingRequest>();

  if (!body.type || !body.projectStage || !body.title || !body.projectName || !body.domain || !body.industry || body.amount == null) {
    return c.json({ success: false, data: null, error: '缺少必填字段（type, projectStage, title, projectName, domain, industry, amount）' }, 400);
  }

  const filing = await filingService.createFiling(body, user.id, user.name);
  return c.json({ success: true, data: filing, error: null }, 201);
});

/** GET /api/filings — 查询备案列表 */
filingsRouter.get('/', async (c) => {
  const params: FilingQueryParams = {
    type: c.req.query('type') as FilingQueryParams['type'],
    projectStage: c.req.query('projectStage') as FilingQueryParams['projectStage'],
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

/** GET /api/filings/approval-chain-preview — 预览审批链（业务侧 + 集团侧 + 确认） */
filingsRouter.get('/approval-chain-preview', async (c) => {
  const user = c.get('user');
  const domain = c.req.query('domain') || user.domain;
  const filingType = c.req.query('filingType') || 'equity_direct';
  const amount = c.req.query('amount') || '0';
  const groupsParam = c.req.query('approvalGroups') || '';

  try {
    const orgProvider = getOrgProvider();
    const businessChain = await orgProvider.getBusinessApproverChain({
      creatorId: user.id,
      creatorDepartment: user.department,
      creatorDomain: domain,
      filingType,
      amount,
    });

    const groupNames = groupsParam ? groupsParam.split(',').filter(Boolean) as import('@filing/shared').ApprovalGroupName[] : [];
    const groupApprovers = groupNames.length > 0 ? await orgProvider.getGroupApprovers(groupNames) : [];
    const confirmer = await orgProvider.getConfirmationApprover();

    return c.json({
      success: true,
      data: { business: businessChain, group: groupApprovers, confirmation: confirmer },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取审批链失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
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
    const filing = await filingService.updateFiling(c.req.param('id'), body, user.id, user.name);
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
    const filing = await filingService.submitFiling(c.req.param('id'), user.id, user.name);
    return c.json({ success: true, data: filing, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** POST /api/filings/:id/recall — 撤回备案 */
filingsRouter.post('/:id/recall', async (c) => {
  const user = c.get('user');

  try {
    const filing = await filingService.recallFiling(c.req.param('id'), user.id, user.name);
    return c.json({ success: true, data: filing, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '撤回失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** GET /api/filings/:id/email-preview — 预览完结邮件（收件人+正文） */
filingsRouter.get('/:id/email-preview', async (c) => {
  try {
    const preview = await emailService.getEmailPreview(c.req.param('id'));
    if (!preview) {
      return c.json({ success: false, data: null, error: '备案不存在' }, 404);
    }
    return c.json({ success: true, data: preview, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取邮件预览失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** GET /api/filings/:id/audit-logs — 获取审计日志 */
filingsRouter.get('/:id/audit-logs', async (c) => {
  const logs = await auditService.getAuditLogs('filing', c.req.param('id'));
  return c.json({ success: true, data: logs, error: null });
});

export { filingsRouter };
