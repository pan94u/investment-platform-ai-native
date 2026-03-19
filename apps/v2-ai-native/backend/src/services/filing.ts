import { eq, and, ilike, gte, lte, sql, desc, count } from 'drizzle-orm';
import { filings, approvals, users } from '@filing/database';
import type { CreateFilingRequest, UpdateFilingRequest, FilingQueryParams, AIPrefillResult } from '@filing/shared';
import { db } from '../lib/db.js';
import { generateId, generateFilingNumber } from '../lib/id.js';

/** 获取下一个备案序号 */
async function getNextSeq(): Promise<number> {
  const today = new Date();
  const datePrefix = `BG${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const result = await db
    .select({ cnt: count() })
    .from(filings)
    .where(ilike(filings.filingNumber, `${datePrefix}%`));
  return (result[0]?.cnt ?? 0) + 1;
}

/** 创建备案（草稿） */
export async function createFiling(data: CreateFilingRequest, creatorId: string) {
  const seq = await getNextSeq();
  const id = generateId('filing');
  const filingNumber = generateFilingNumber(seq);

  const [filing] = await db.insert(filings).values({
    id,
    filingNumber,
    type: data.type,
    title: data.title,
    description: data.description,
    projectName: data.projectName,
    legalEntityName: data.legalEntityName ?? null,
    domain: data.domain,
    industry: data.industry,
    amount: String(data.amount),
    currency: data.currency ?? 'CNY',
    investmentRatio: data.investmentRatio != null ? String(data.investmentRatio) : null,
    valuationAmount: data.valuationAmount != null ? String(data.valuationAmount) : null,
    originalTarget: data.originalTarget != null ? String(data.originalTarget) : null,
    newTarget: data.newTarget != null ? String(data.newTarget) : null,
    changeReason: data.changeReason ?? null,
    status: 'draft',
    creatorId,
  }).returning();

  return filing;
}

/** 从 AI 预填充结果创建备案 */
export async function createFilingFromAI(prefillResult: AIPrefillResult, creatorId: string) {
  const fields = prefillResult.fields as Record<string, any>;

  const data: CreateFilingRequest = {
    type: fields.type || 'other',
    projectStage: fields.projectStage || 'invest',
    title: fields.title || '待确认备案',
    description: fields.description || '',
    projectName: fields.projectName || '待确认项目',
    legalEntityName: fields.legalEntityName,
    domain: fields.domain || 'smart_living',
    industry: fields.industry || '待确认',
    amount: Number(fields.amount) || 0,
    currency: fields.currency || 'CNY',
    investmentRatio: fields.investmentRatio != null ? Number(fields.investmentRatio) : undefined,
    valuationAmount: fields.valuationAmount != null ? Number(fields.valuationAmount) : undefined,
    originalTarget: fields.originalTarget != null ? Number(fields.originalTarget) : undefined,
    newTarget: fields.newTarget != null ? Number(fields.newTarget) : undefined,
    changeReason: fields.changeReason,
  };

  return createFiling(data, creatorId);
}

/** 更新备案（仅草稿状态可编辑） */
export async function updateFiling(id: string, data: UpdateFilingRequest, userId: string) {
  const existing = await db.select().from(filings).where(eq(filings.id, id)).limit(1);
  if (existing.length === 0) throw new Error('备案不存在');
  if (existing[0].status !== 'draft') throw new Error('仅草稿状态可编辑');
  if (existing[0].creatorId !== userId) throw new Error('无权编辑此备案');

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.type !== undefined) updateData.type = data.type;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.projectName !== undefined) updateData.projectName = data.projectName;
  if (data.legalEntityName !== undefined) updateData.legalEntityName = data.legalEntityName;
  if (data.domain !== undefined) updateData.domain = data.domain;
  if (data.industry !== undefined) updateData.industry = data.industry;
  if (data.amount !== undefined) updateData.amount = String(data.amount);
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.investmentRatio !== undefined) updateData.investmentRatio = data.investmentRatio != null ? String(data.investmentRatio) : null;
  if (data.valuationAmount !== undefined) updateData.valuationAmount = data.valuationAmount != null ? String(data.valuationAmount) : null;
  if (data.originalTarget !== undefined) updateData.originalTarget = data.originalTarget != null ? String(data.originalTarget) : null;
  if (data.newTarget !== undefined) updateData.newTarget = data.newTarget != null ? String(data.newTarget) : null;
  if (data.changeReason !== undefined) updateData.changeReason = data.changeReason;

  const [updated] = await db.update(filings).set(updateData).where(eq(filings.id, id)).returning();
  return updated;
}

/** 获取单个备案详情 */
export async function getFilingById(id: string) {
  const result = await db
    .select()
    .from(filings)
    .leftJoin(users, eq(filings.creatorId, users.id))
    .where(eq(filings.id, id))
    .limit(1);

  if (result.length === 0) return null;

  const { filings: filing, users: creator } = result[0];
  return {
    ...filing,
    creator: creator ? { id: creator.id, name: creator.name, department: creator.department } : null,
  };
}

/** 查询备案列表（分页 + 筛选） */
export async function queryFilings(params: FilingQueryParams) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (params.type) conditions.push(eq(filings.type, params.type));
  if (params.status) conditions.push(eq(filings.status, params.status));
  if (params.domain) conditions.push(eq(filings.domain, params.domain));
  if (params.creatorId) conditions.push(eq(filings.creatorId, params.creatorId));
  if (params.dateFrom) conditions.push(gte(filings.createdAt, new Date(params.dateFrom)));
  if (params.dateTo) conditions.push(lte(filings.createdAt, new Date(params.dateTo)));
  if (params.keyword) {
    conditions.push(
      sql`(${filings.title} ILIKE ${'%' + params.keyword + '%'} OR ${filings.projectName} ILIKE ${'%' + params.keyword + '%'} OR ${filings.filingNumber} ILIKE ${'%' + params.keyword + '%'})`
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(filings)
      .where(where)
      .orderBy(desc(filings.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ cnt: count() })
      .from(filings)
      .where(where),
  ]);

  const total = totalResult[0]?.cnt ?? 0;

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** 提交备案（草稿 → 待上级审批） */
export async function submitFiling(filingId: string, userId: string) {
  const existing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (existing.length === 0) throw new Error('备案不存在');
  if (existing[0].status !== 'draft') throw new Error('仅草稿状态可提交');
  if (existing[0].creatorId !== userId) throw new Error('无权提交此备案');

  // 查找上级审批人（supervisor）
  const supervisors = await db.select().from(users).where(eq(users.role, 'supervisor'));
  if (supervisors.length === 0) throw new Error('未找到上级审批人');

  const now = new Date();

  // 创建一级审批记录
  await db.insert(approvals).values({
    id: generateId('approval'),
    filingId,
    approverId: supervisors[0].id,
    approverName: supervisors[0].name,
    stage: 'business',
    level: 1,
    status: 'pending',
  });

  // 更新备案状态
  const [updated] = await db
    .update(filings)
    .set({ status: 'pending_business', submittedAt: now, updatedAt: now })
    .where(eq(filings.id, filingId))
    .returning();

  return updated;
}

/** 获取项目历史备案（按项目名查询） */
export async function getFilingHistory(projectName: string) {
  return db
    .select()
    .from(filings)
    .where(eq(filings.projectName, projectName))
    .orderBy(desc(filings.createdAt));
}

/** 获取看板统计 */
export async function getDashboardStats() {
  const statusCounts = await db
    .select({ status: filings.status, cnt: count() })
    .from(filings)
    .groupBy(filings.status);

  const typeCounts = await db
    .select({ type: filings.type, cnt: count() })
    .from(filings)
    .groupBy(filings.type);

  const domainCounts = await db
    .select({ domain: filings.domain, cnt: count() })
    .from(filings)
    .groupBy(filings.domain);

  const totalAmount = await db
    .select({ total: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text` })
    .from(filings);

  return {
    byStatus: statusCounts,
    byType: typeCounts,
    byDomain: domainCounts,
    totalAmount: totalAmount[0]?.total ?? '0',
    totalCount: statusCounts.reduce((sum: number, s: { status: string; cnt: number }) => sum + s.cnt, 0),
  };
}
