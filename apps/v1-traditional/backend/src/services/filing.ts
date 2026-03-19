import { eq, and, ilike, gte, lte, sql, desc, count } from 'drizzle-orm';
import { filings, approvals, users } from '@filing/database';
import type { CreateFilingRequest, UpdateFilingRequest, FilingQueryParams } from '@filing/shared';
import { db } from '../lib/db.js';
import { generateId, generateFilingNumber } from '../lib/id.js';
import { getOrgProvider, getNotifyProvider } from '../providers/index.js';
import * as auditService from './audit.js';

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
export async function createFiling(data: CreateFilingRequest, creatorId: string, creatorName: string) {
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

  await auditService.logAudit({
    action: 'filing_created',
    entityType: 'filing',
    entityId: filing.id,
    userId: creatorId,
    userName: creatorName,
    detail: { type: data.type, title: data.title, amount: data.amount },
  });

  return filing;
}

/** 更新备案（仅草稿状态可编辑） */
export async function updateFiling(id: string, data: UpdateFilingRequest, userId: string, userName: string) {
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

  await auditService.logAudit({
    action: 'filing_updated',
    entityType: 'filing',
    entityId: updated.id,
    userId,
    userName,
    detail: { changes: data },
  });

  return updated;
}

/** 将备案编号（BG20260313-001）或内部 ID（filing-xxx）统一解析为内部 ID */
export async function resolveFilingId(idOrNumber: string): Promise<string | null> {
  if (idOrNumber.startsWith('filing-')) return idOrNumber;
  // 尝试按 filingNumber 查
  if (/^BG\d{8}-\d+$/.test(idOrNumber)) {
    const row = await db.select({ id: filings.id }).from(filings).where(eq(filings.filingNumber, idOrNumber)).limit(1);
    return row[0]?.id ?? null;
  }
  return idOrNumber; // fallback — 原样传入，由后续查询报错
}

/** 获取单个备案详情 */
export async function getFilingById(id: string) {
  const resolvedId = await resolveFilingId(id);
  if (!resolvedId) return null;
  const result = await db
    .select()
    .from(filings)
    .leftJoin(users, eq(filings.creatorId, users.id))
    .where(eq(filings.id, resolvedId))
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
    db.select().from(filings).where(where).orderBy(desc(filings.createdAt)).limit(pageSize).offset(offset),
    db.select({ cnt: count() }).from(filings).where(where),
  ]);

  const total = totalResult[0]?.cnt ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** 提交备案（草稿→待审批），使用 OrgProvider 获取审批链 */
export async function submitFiling(filingId: string, userId: string, userName: string) {
  const existing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (existing.length === 0) throw new Error('备案不存在');
  if (existing[0].status !== 'draft') throw new Error('仅草稿状态可提交');
  if (existing[0].creatorId !== userId) throw new Error('无权提交此备案');

  const filing = existing[0];

  // 获取创建人信息
  const creatorRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const creator = creatorRows[0];

  // 通过 OrgProvider 获取审批链（含同人捏合）
  const orgProvider = getOrgProvider();
  const chain = await orgProvider.getApproverChain({
    creatorId: userId,
    creatorDepartment: creator.department,
    creatorDomain: creator.domain,
    filingType: filing.type,
    amount: filing.amount,
  });

  if (chain.length === 0) throw new Error('未找到审批人');

  const now = new Date();
  const notifyProvider = getNotifyProvider();

  // 创建第一级审批
  const approvalId = generateId('approval');
  const firstApprover = chain[0];

  await db.insert(approvals).values({
    id: approvalId,
    filingId,
    approverId: firstApprover.userId,
    approverName: firstApprover.name,
    level: 1,
    status: 'pending',
  });

  // 推送待办通知
  const externalTodoId = await notifyProvider.pushTodo({
    approvalId,
    filingId,
    filingTitle: filing.title,
    filingNumber: filing.filingNumber,
    approverUserId: firstApprover.userId,
    approverName: firstApprover.name,
    level: 1,
    creatorName: userName,
    amount: filing.amount,
    filingType: filing.type,
  });

  if (externalTodoId) {
    await db.update(approvals).set({ externalTodoId }).where(eq(approvals.id, approvalId));
  }

  // 更新备案状态
  const [updated] = await db
    .update(filings)
    .set({ status: 'pending_level1', submittedAt: now, updatedAt: now })
    .where(eq(filings.id, filingId))
    .returning();

  await auditService.logAudit({
    action: 'filing_submitted',
    entityType: 'filing',
    entityId: filingId,
    userId,
    userName,
    detail: { approverChainLength: chain.length, firstApprover: firstApprover.name },
  });

  return updated;
}

/** 撤回备案（发起人在审批未决前撤回） */
export async function recallFiling(filingId: string, userId: string, userName: string) {
  const existing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (existing.length === 0) throw new Error('备案不存在');

  const filing = existing[0];
  if (filing.status !== 'pending_level1' && filing.status !== 'pending_level2') {
    throw new Error('仅待审批状态可撤回');
  }
  if (filing.creatorId !== userId) throw new Error('仅发起人可撤回');

  // 检查是否有已决定的审批（已决定的不允许撤回）
  const pendingApprovals = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.filingId, filingId), eq(approvals.status, 'pending')));

  if (pendingApprovals.length === 0) {
    throw new Error('当前审批已被处理，无法撤回');
  }

  const now = new Date();
  const notifyProvider = getNotifyProvider();

  // 关闭所有 pending 审批
  for (const approval of pendingApprovals) {
    await db.update(approvals).set({
      status: 'rejected',
      comment: '发起人撤回',
      decidedAt: now,
    }).where(eq(approvals.id, approval.id));

    if (approval.externalTodoId) {
      await notifyProvider.closeTodo(approval.externalTodoId, 'recalled');
    }
  }

  // 更新备案状态
  const [updated] = await db
    .update(filings)
    .set({ status: 'recalled', updatedAt: now })
    .where(eq(filings.id, filingId))
    .returning();

  await auditService.logAudit({
    action: 'filing_recalled',
    entityType: 'filing',
    entityId: filingId,
    userId,
    userName,
  });

  return updated;
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
