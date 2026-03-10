import { eq, and, desc } from 'drizzle-orm';
import { approvals, filings, users } from '@filing/database';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';

/** 获取待审批列表 */
export async function getApprovalTodos(approverId: string) {
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
    .where(and(eq(approvals.approverId, approverId), eq(approvals.status, 'pending')))
    .orderBy(desc(filings.submittedAt));

  return todos;
}

/** 审批操作（同意/驳回） */
export async function processApproval(approvalId: string, approverId: string, action: 'approve' | 'reject', comment?: string) {
  // 验证审批记录
  const existing = await db.select().from(approvals).where(eq(approvals.id, approvalId)).limit(1);
  if (existing.length === 0) throw new Error('审批记录不存在');
  if (existing[0].approverId !== approverId) throw new Error('无权处理此审批');
  if (existing[0].status !== 'pending') throw new Error('此审批已处理');

  const approval = existing[0];
  const now = new Date();

  // 更新审批状态
  await db.update(approvals).set({
    status: action === 'approve' ? 'approved' : 'rejected',
    comment: comment ?? null,
    decidedAt: now,
  }).where(eq(approvals.id, approvalId));

  if (action === 'reject') {
    // 驳回 → 备案直接变为已驳回
    await db.update(filings).set({
      status: 'rejected',
      updatedAt: now,
    }).where(eq(filings.id, approval.filingId));
    return { status: 'rejected' };
  }

  // 同意 → 判断是否需要下一级审批
  if (approval.level === 1) {
    // 一级通过 → 创建二级审批
    const groupApprovers = await db.select().from(users).where(eq(users.role, 'group_approver'));
    if (groupApprovers.length === 0) throw new Error('未找到集团审批人');

    await db.insert(approvals).values({
      id: generateId('approval'),
      filingId: approval.filingId,
      approverId: groupApprovers[0].id,
      approverName: groupApprovers[0].name,
      level: 2,
      status: 'pending',
    });

    await db.update(filings).set({
      status: 'pending_level2',
      updatedAt: now,
    }).where(eq(filings.id, approval.filingId));

    return { status: 'pending_level2' };
  }

  // 二级通过 → 备案完成
  await db.update(filings).set({
    status: 'completed',
    completedAt: now,
    updatedAt: now,
  }).where(eq(filings.id, approval.filingId));

  return { status: 'completed' };
}

/** 获取某备案的审批历史 */
export async function getApprovalHistory(filingId: string) {
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.filingId, filingId))
    .orderBy(approvals.level);
}
