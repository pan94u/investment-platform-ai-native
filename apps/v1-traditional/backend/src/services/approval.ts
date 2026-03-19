import { eq, and, desc, inArray } from 'drizzle-orm';
import { approvals, filings, users } from '@filing/database';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';
import { getOrgProvider, getNotifyProvider } from '../providers/index.js';
import * as auditService from './audit.js';

/** 获取待审批列表（admin 可见所有 pending 审批，用于改派） */
export async function getApprovalTodos(approverId: string, isAdmin = false) {
  const conditions = isAdmin
    ? eq(approvals.status, 'pending')
    : and(eq(approvals.approverId, approverId), eq(approvals.status, 'pending'));

  return db
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
      approverName: approvals.approverName,
    })
    .from(approvals)
    .innerJoin(filings, eq(approvals.filingId, filings.id))
    .innerJoin(users, eq(filings.creatorId, users.id))
    .where(conditions)
    .orderBy(desc(filings.submittedAt));
}

/** 审批操作（同意/驳回），支持同人捏合 */
export async function processApproval(
  approvalId: string,
  approverId: string,
  action: 'approve' | 'reject',
  comment?: string,
  approverName?: string,
) {
  // 验证审批记录
  const existing = await db.select().from(approvals).where(eq(approvals.id, approvalId)).limit(1);
  if (existing.length === 0) throw new Error('审批记录不存在');
  if (existing[0].approverId !== approverId) throw new Error('无权处理此审批');
  if (existing[0].status !== 'pending') throw new Error('此审批已处理');

  const approval = existing[0];
  const now = new Date();
  const notifyProvider = getNotifyProvider();

  // 更新审批状态
  await db.update(approvals).set({
    status: action === 'approve' ? 'approved' : 'rejected',
    comment: comment ?? null,
    decidedAt: now,
  }).where(eq(approvals.id, approvalId));

  // 关闭外部待办
  if (approval.externalTodoId) {
    await notifyProvider.closeTodo(approval.externalTodoId, action === 'approve' ? 'approved' : 'rejected');
  }

  // 获取备案信息
  const filingRows = await db.select().from(filings).where(eq(filings.id, approval.filingId)).limit(1);
  const filing = filingRows[0];

  const resolvedName = approverName ?? approval.approverName;

  if (action === 'reject') {
    await db.update(filings).set({ status: 'rejected', updatedAt: now }).where(eq(filings.id, approval.filingId));

    await auditService.logAudit({
      action: 'filing_rejected',
      entityType: 'approval',
      entityId: approvalId,
      userId: approverId,
      userName: resolvedName,
      detail: { comment, level: approval.level },
    });

    return { status: 'rejected' };
  }

  // 同意 → 判断是否需要下一级
  const creatorRows = await db.select().from(users).where(eq(users.id, filing.creatorId)).limit(1);
  const creator = creatorRows[0];

  const orgProvider = getOrgProvider();
  const chain = await orgProvider.getApproverChain({
    creatorId: filing.creatorId,
    creatorDepartment: creator.department,
    creatorDomain: creator.domain,
    filingType: filing.type,
    amount: filing.amount,
  });

  if (approval.level < chain.length) {
    // 还有下一级 → 创建下一级审批
    const nextApprover = chain[approval.level]; // chain 是 0-indexed, level 是 1-indexed
    const nextApprovalId = generateId('approval');

    await db.insert(approvals).values({
      id: nextApprovalId,
      filingId: approval.filingId,
      approverId: nextApprover.userId,
      approverName: nextApprover.name,
      level: approval.level + 1,
      status: 'pending',
    });

    const externalTodoId = await notifyProvider.pushTodo({
      approvalId: nextApprovalId,
      filingId: approval.filingId,
      filingTitle: filing.title,
      filingNumber: filing.filingNumber,
      approverUserId: nextApprover.userId,
      approverName: nextApprover.name,
      level: approval.level + 1,
      creatorName: creator.name,
      amount: filing.amount,
      filingType: filing.type,
    });

    if (externalTodoId) {
      await db.update(approvals).set({ externalTodoId }).where(eq(approvals.id, nextApprovalId));
    }

    const nextStatus = `pending_level${approval.level + 1}`;
    await db.update(filings).set({ status: nextStatus, updatedAt: now }).where(eq(filings.id, approval.filingId));

    await auditService.logAudit({
      action: 'filing_approved',
      entityType: 'approval',
      entityId: approvalId,
      userId: approverId,
      userName: resolvedName,
      detail: { comment, level: approval.level, nextLevel: approval.level + 1 },
    });

    return { status: nextStatus };
  }

  // 最后一级 → 备案完成
  await db.update(filings).set({
    status: 'completed',
    completedAt: now,
    updatedAt: now,
  }).where(eq(filings.id, approval.filingId));

  await auditService.logAudit({
    action: 'filing_approved',
    entityType: 'approval',
    entityId: approvalId,
    userId: approverId,
    userName: resolvedName,
    detail: { comment, level: approval.level, final: true },
  });

  return { status: 'completed' };
}

/** 管理员改派审批人 */
export async function reassignApproval(
  approvalId: string,
  adminUserId: string,
  adminName: string,
  newApproverId: string,
  reason?: string,
) {
  const existing = await db.select().from(approvals).where(eq(approvals.id, approvalId)).limit(1);
  if (existing.length === 0) throw new Error('审批记录不存在');
  if (existing[0].status !== 'pending') throw new Error('仅待审批状态可改派');

  const approval = existing[0];
  const notifyProvider = getNotifyProvider();

  // 查新审批人
  const newApproverRows = await db.select().from(users).where(eq(users.id, newApproverId)).limit(1);
  if (newApproverRows.length === 0) throw new Error('新审批人不存在');
  const newApprover = newApproverRows[0];

  const oldApproverId = approval.approverId;
  const oldApproverName = approval.approverName;

  // 更新审批记录
  await db.update(approvals).set({
    approverId: newApproverId,
    approverName: newApprover.name,
    reassignedFrom: oldApproverId,
  }).where(eq(approvals.id, approvalId));

  // 关闭旧待办 + 推送新待办
  if (approval.externalTodoId) {
    await notifyProvider.closeTodo(approval.externalTodoId, 'recalled');
  }

  // 获取备案信息用于推送
  const filingRows = await db.select().from(filings).where(eq(filings.id, approval.filingId)).limit(1);
  const filing = filingRows[0];
  const creatorRows = await db.select().from(users).where(eq(users.id, filing.creatorId)).limit(1);

  const externalTodoId = await notifyProvider.pushTodo({
    approvalId,
    filingId: approval.filingId,
    filingTitle: filing.title,
    filingNumber: filing.filingNumber,
    approverUserId: newApproverId,
    approverName: newApprover.name,
    level: approval.level,
    creatorName: creatorRows[0]?.name ?? '',
    amount: filing.amount,
    filingType: filing.type,
  });

  if (externalTodoId) {
    await db.update(approvals).set({ externalTodoId }).where(eq(approvals.id, approvalId));
  }

  await auditService.logAudit({
    action: 'approval_reassigned',
    entityType: 'approval',
    entityId: approvalId,
    userId: adminUserId,
    userName: adminName,
    detail: { from: oldApproverName, fromId: oldApproverId, to: newApprover.name, toId: newApproverId, reason },
  });

  return { success: true, newApprover: newApprover.name };
}

/** 批量审批 */
export async function batchApprove(
  approvalIds: string[],
  approverId: string,
  approverName: string,
  comment?: string,
) {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const id of approvalIds) {
    try {
      await processApproval(id, approverId, 'approve', comment, approverName);
      succeeded.push(id);
    } catch (err) {
      failed.push({ id, error: err instanceof Error ? err.message : '审批失败' });
    }
  }

  if (succeeded.length > 0) {
    await auditService.logAudit({
      action: 'approval_batch_approved',
      entityType: 'approval',
      entityId: succeeded.join(','),
      userId: approverId,
      userName: approverName,
      detail: { count: succeeded.length, comment },
    });
  }

  return { succeeded, failed };
}

/** 获取某备案的审批历史 */
export async function getApprovalHistory(filingId: string) {
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.filingId, filingId))
    .orderBy(approvals.level);
}
