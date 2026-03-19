import { Hono } from 'hono';
import { eq, and, ilike, gte, lte, sql, desc, count } from 'drizzle-orm';
import { filings, users, auditLogs } from '@filing/database';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../lib/db.js';
import { generateId, generateFilingNumber } from '../lib/id.js';
import {
  sanitizeInput,
  checkPermission,
  logSecurityEvent,
} from '../middleware/security.js';
import { runPreHooks } from '../rules/compliance-rules.js';

const filingsRouter = new Hono<AppEnv>();

filingsRouter.use('/*', authMiddleware);

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
// Helper: get next seq
// ---------------------------------------------------------------------------

async function getNextSeq(): Promise<number> {
  const today = new Date();
  const datePrefix = `BG${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const result = await db
    .select({ cnt: count() })
    .from(filings)
    .where(ilike(filings.filingNumber, `${datePrefix}%`));
  return (result[0]?.cnt ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** POST /api/filings — 创建备案 */
filingsRouter.post('/', async (c) => {
  const user = c.get('user');

  // 权限检查
  const perm = checkPermission(user.id, user.role, 'filing_create');
  if (!perm.allowed) {
    return c.json({ success: false, data: null, error: `权限不足: ${perm.reason}` }, 403);
  }

  const body = await c.req.json();

  // 合规前置检查
  const compliance = runPreHooks('filing_create', body);
  if (!compliance.passed) {
    return c.json({
      success: false,
      data: { violations: compliance.violations, warnings: compliance.warnings },
      error: `合规检查未通过: ${compliance.violations.map((v) => v.message).join('; ')}`,
    }, 422);
  }

  if (!body.type || !body.title || !body.projectName || !body.domain || !body.industry || body.amount == null) {
    return c.json({ success: false, data: null, error: '缺少必填字段' }, 400);
  }

  const seq = await getNextSeq();
  const id = generateId('filing');
  const filingNumber = generateFilingNumber(seq);

  const [filing] = await db.insert(filings).values({
    id,
    filingNumber,
    type: body.type,
    title: body.title,
    description: body.description ?? '',
    projectName: body.projectName,
    legalEntityName: body.legalEntityName ?? null,
    domain: body.domain,
    industry: body.industry,
    amount: String(body.amount),
    currency: body.currency ?? 'CNY',
    investmentRatio: body.investmentRatio != null ? String(body.investmentRatio) : null,
    valuationAmount: body.valuationAmount != null ? String(body.valuationAmount) : null,
    originalTarget: body.originalTarget != null ? String(body.originalTarget) : null,
    newTarget: body.newTarget != null ? String(body.newTarget) : null,
    changeReason: body.changeReason ?? null,
    status: 'draft',
    creatorId: user.id,
  }).returning();

  await logAudit({
    action: 'filing_created',
    entityType: 'filing',
    entityId: filing.id,
    userId: user.id,
    userName: user.name,
    detail: { type: body.type, title: body.title, amount: body.amount },
  });

  logSecurityEvent({
    type: 'data_access',
    userId: user.id,
    action: 'filing_create',
    output: `创建备案 ${filing.filingNumber}`,
    sanitized: false,
    allowed: true,
  });

  return c.json({
    success: true,
    data: { ...filing, _complianceWarnings: compliance.warnings.length > 0 ? compliance.warnings : undefined },
    error: null,
  }, 201);
});

/** GET /api/filings — 查询备案列表 */
filingsRouter.get('/', async (c) => {
  const user = c.get('user');
  const perm = checkPermission(user.id, user.role, 'filing_list');
  if (!perm.allowed) {
    return c.json({ success: false, data: null, error: `权限不足: ${perm.reason}` }, 403);
  }

  const page = Number(c.req.query('page') ?? 1);
  const pageSize = Math.min(Number(c.req.query('pageSize') ?? 20), 100);
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const type = c.req.query('type');
  const status = c.req.query('status');
  const domain = c.req.query('domain');
  const creatorId = c.req.query('creatorId');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const keyword = c.req.query('keyword');

  if (type) conditions.push(eq(filings.type, type));
  if (status) conditions.push(eq(filings.status, status));
  if (domain) conditions.push(eq(filings.domain, domain));
  if (creatorId) conditions.push(eq(filings.creatorId, creatorId));
  if (dateFrom) conditions.push(gte(filings.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(filings.createdAt, new Date(dateTo)));
  if (keyword) {
    const kw = `%${keyword}%`;
    conditions.push(
      sql`(${filings.title} ILIKE ${kw} OR ${filings.projectName} ILIKE ${kw} OR ${filings.filingNumber} ILIKE ${kw})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select().from(filings).where(where).orderBy(desc(filings.createdAt)).limit(pageSize).offset(offset),
    db.select({ cnt: count() }).from(filings).where(where),
  ]);

  const total = totalResult[0]?.cnt ?? 0;

  return c.json({
    success: true,
    data: { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    error: null,
  });
});

/** GET /api/filings/:id — 获取备案详情 */
filingsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const perm = checkPermission(user.id, user.role, 'filing_get');
  if (!perm.allowed) {
    return c.json({ success: false, data: null, error: `权限不足: ${perm.reason}` }, 403);
  }

  const result = await db
    .select()
    .from(filings)
    .leftJoin(users, eq(filings.creatorId, users.id))
    .where(eq(filings.id, c.req.param('id')))
    .limit(1);

  if (result.length === 0) {
    return c.json({ success: false, data: null, error: '备案不存在' }, 404);
  }

  const { filings: filing, users: creator } = result[0];

  logSecurityEvent({
    type: 'data_access',
    userId: user.id,
    action: 'filing_get',
    output: `查看备案 ${filing.filingNumber}`,
    sanitized: false,
    allowed: true,
  });

  return c.json({
    success: true,
    data: {
      ...filing,
      creator: creator ? { id: creator.id, name: creator.name, department: creator.department } : null,
    },
    error: null,
  });
});

/** PUT /api/filings/:id — 更新备案 */
filingsRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const perm = checkPermission(user.id, user.role, 'filing_update');
  if (!perm.allowed) {
    return c.json({ success: false, data: null, error: `权限不足: ${perm.reason}` }, 403);
  }

  const body = await c.req.json();
  const filingId = c.req.param('id');

  // 合规检查
  const compliance = runPreHooks('filing_update', body);
  if (!compliance.passed) {
    return c.json({
      success: false,
      data: { violations: compliance.violations },
      error: `合规检查未通过: ${compliance.violations.map((v) => v.message).join('; ')}`,
    }, 422);
  }

  const existing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (existing.length === 0) {
    return c.json({ success: false, data: null, error: '备案不存在' }, 404);
  }
  if (existing[0].status !== 'draft') {
    return c.json({ success: false, data: null, error: '仅草稿状态可编辑' }, 400);
  }
  if (existing[0].creatorId !== user.id) {
    return c.json({ success: false, data: null, error: '无权编辑此备案' }, 403);
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ['type', 'title', 'description', 'projectName', 'legalEntityName', 'domain', 'industry', 'currency', 'changeReason'] as const;
  for (const f of fields) {
    if (body[f] !== undefined) updateData[f] = body[f];
  }
  const numericFields = ['amount', 'investmentRatio', 'valuationAmount', 'originalTarget', 'newTarget'] as const;
  for (const f of numericFields) {
    if (body[f] !== undefined) updateData[f] = body[f] != null ? String(body[f]) : null;
  }

  const [updated] = await db.update(filings).set(updateData).where(eq(filings.id, filingId)).returning();

  await logAudit({
    action: 'filing_updated',
    entityType: 'filing',
    entityId: updated.id,
    userId: user.id,
    userName: user.name,
    detail: { changes: body },
  });

  return c.json({ success: true, data: updated, error: null });
});

/** POST /api/filings/:id/submit — 提交备案 */
filingsRouter.post('/:id/submit', async (c) => {
  const user = c.get('user');
  const perm = checkPermission(user.id, user.role, 'filing_submit');
  if (!perm.allowed) {
    return c.json({ success: false, data: null, error: `权限不足: ${perm.reason}` }, 403);
  }

  const filingId = c.req.param('id');

  const existing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (existing.length === 0) {
    return c.json({ success: false, data: null, error: '备案不存在' }, 404);
  }
  if (existing[0].status !== 'draft') {
    return c.json({ success: false, data: null, error: '仅草稿状态可提交' }, 400);
  }
  if (existing[0].creatorId !== user.id) {
    return c.json({ success: false, data: null, error: '无权提交此备案' }, 403);
  }

  // 合规提交前检查
  const compliance = runPreHooks('filing_submit', existing[0] as unknown as Record<string, string | number | undefined>);
  if (!compliance.passed) {
    return c.json({
      success: false,
      data: { violations: compliance.violations },
      error: `合规检查未通过: ${compliance.violations.map((v) => v.message).join('; ')}`,
    }, 422);
  }

  // 查找上级审批人
  const { approvals } = await import('@filing/database');
  const supervisors = await db.select().from(users).where(eq(users.role, 'supervisor'));
  if (supervisors.length === 0) {
    return c.json({ success: false, data: null, error: '未找到上级审批人' }, 500);
  }

  const now = new Date();

  await db.insert(approvals).values({
    id: generateId('approval'),
    filingId,
    approverId: supervisors[0].id,
    approverName: supervisors[0].name,
    stage: 'business',
    level: 1,
    status: 'pending',
  });

  const [updated] = await db
    .update(filings)
    .set({ status: 'pending_business', submittedAt: now, updatedAt: now })
    .where(eq(filings.id, filingId))
    .returning();

  await logAudit({
    action: 'filing_submitted',
    entityType: 'filing',
    entityId: updated.id,
    userId: user.id,
    userName: user.name,
  });

  logSecurityEvent({
    type: 'data_access',
    userId: user.id,
    action: 'filing_submit',
    output: `提交备案 ${updated.filingNumber}`,
    sanitized: false,
    allowed: true,
  });

  return c.json({ success: true, data: updated, error: null });
});

/** GET /api/filings/:id/audit-logs — 获取审计日志 */
filingsRouter.get('/:id/audit-logs', async (c) => {
  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.entityId, c.req.param('id')))
    .orderBy(desc(auditLogs.createdAt));

  return c.json({ success: true, data: logs, error: null });
});

export { filingsRouter };
