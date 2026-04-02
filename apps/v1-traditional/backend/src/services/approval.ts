import { eq, and, desc } from 'drizzle-orm';
import { approvals, filings, users } from '@filing/database';
import type { ApprovalAction, ApprovalGroupName } from '@filing/shared';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';
import { getOrgProvider, getNotifyProvider } from '../providers/index.js';
import * as auditService from './audit.js';
import { sendCompletionEmail, sendCompletionEmailWithOverrides } from './email.js';

export interface EmailOptions {
  skipEmail?: boolean;
  emailOverrides?: { to?: string[]; cc?: string[]; subject?: string };
}

// ─── 查询 ────────────────────────────────────────────

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
      stage: approvals.stage,
      level: approvals.level,
      groupName: approvals.groupName,
      submittedAt: filings.submittedAt,
      approverName: approvals.approverName,
    })
    .from(approvals)
    .innerJoin(filings, eq(approvals.filingId, filings.id))
    .innerJoin(users, eq(filings.creatorId, users.id))
    .where(conditions)
    .orderBy(desc(filings.submittedAt));
}

/** 获取某备案的审批历史 */
export async function getApprovalHistory(filingId: string) {
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.filingId, filingId))
    .orderBy(approvals.stage, approvals.level);
}

// ─── 核心: 审批操作 ──────────────────────────────────

/**
 * 处理审批操作（同意 / 驳回 / 知悉）
 *
 * 状态流转规则:
 *
 * [business 阶段]
 *   approve → 如果还有下一级业务审批人 → 创建下一级
 *           → 如果是最后一级 → 进入 group 阶段（或直接进入 confirmation）
 *   reject  → filing → rejected
 *   acknowledge → 视为通过，流转到下一级
 *
 * [group 阶段]
 *   approve / acknowledge → 检查同一 filing 所有 group 审批是否完成
 *                         → 全部完成 → 进入 confirmation
 *   reject → filing → rejected
 *
 * [confirmation 阶段]
 *   approve → filing → completed
 *   reject  → filing → rejected
 */
export async function processApproval(
  approvalId: string,
  approverId: string,
  action: ApprovalAction,
  comment?: string,
  approverName?: string,
  emailOptions?: EmailOptions,
) {
  // 验证审批记录
  const existing = await db.select().from(approvals).where(eq(approvals.id, approvalId)).limit(1);
  if (existing.length === 0) throw new Error('审批记录不存在');
  if (existing[0].approverId !== approverId) throw new Error('无权处理此审批');
  if (existing[0].status !== 'pending') throw new Error('此审批已处理');

  const approval = existing[0];
  const now = new Date();
  const notifyProvider = getNotifyProvider();
  const resolvedName = approverName ?? approval.approverName;

  // 更新审批状态
  const statusMap: Record<ApprovalAction, string> = {
    approve: 'approved',
    reject: 'rejected',
    acknowledge: 'acknowledged',
  };

  await db.update(approvals).set({
    status: statusMap[action],
    comment: comment ?? null,
    decidedAt: now,
  }).where(eq(approvals.id, approvalId));

  // 关闭外部待办
  if (approval.externalTodoId) {
    await notifyProvider.closeTodo(
      approval.externalTodoId,
      action === 'acknowledge' ? 'acknowledged' : (action === 'approve' ? 'approved' : 'rejected'),
    );
  }

  // 获取备案信息
  const filingRows = await db.select().from(filings).where(eq(filings.id, approval.filingId)).limit(1);
  const filing = filingRows[0];

  // 驳回: 任何阶段驳回 → filing 回到草稿（发起人可修改后重新提交），审批记录保留
  if (action === 'reject') {
    // 关闭同一 filing 的其他 pending 审批（如集团阶段并行审批）
    const otherPending = await db
      .select()
      .from(approvals)
      .where(and(eq(approvals.filingId, filing.id), eq(approvals.status, 'pending')));

    for (const other of otherPending) {
      await db.update(approvals).set({
        status: 'rejected',
        comment: '关联审批驳回，自动关闭',
        decidedAt: now,
      }).where(eq(approvals.id, other.id));

      if (other.externalTodoId) {
        await notifyProvider.closeTodo(other.externalTodoId, 'rejected');
      }
    }

    await db.update(filings).set({ status: 'draft', submittedAt: null, updatedAt: now }).where(eq(filings.id, filing.id));

    await auditService.logAudit({
      action: 'filing_rejected',
      entityType: 'approval',
      entityId: approvalId,
      userId: approverId,
      userName: resolvedName,
      detail: { comment, stage: approval.stage, level: approval.level, groupName: approval.groupName },
    });

    return { status: 'rejected' as const, filingStatus: 'draft' as const };
  }

  // 同意或知悉 → 根据阶段决定下一步
  await auditService.logAudit({
    action: action === 'acknowledge' ? 'filing_acknowledged' : 'filing_approved',
    entityType: 'approval',
    entityId: approvalId,
    userId: approverId,
    userName: resolvedName,
    detail: { comment, stage: approval.stage, level: approval.level, groupName: approval.groupName },
  });

  switch (approval.stage) {
    case 'business':
      return handleBusinessApproved(filing, approval, resolvedName, now);
    case 'group':
      return handleGroupApproved(filing, now);
    case 'confirmation':
      return handleConfirmationApproved(filing, approverId, now, emailOptions);
    default:
      throw new Error(`未知审批阶段: ${approval.stage}`);
  }
}

// ─── 阶段流转逻辑 ────────────────────────────────────

/**
 * 业务侧审批通过后:
 *   还有下一级 → 创建下一级
 *   没有了 → 如果有集团审批组 → pending_group + 创建集团审批
 *          → 没有集团审批组 → pending_confirmation + 创建确认任务
 */
async function handleBusinessApproved(
  filing: typeof filings.$inferSelect,
  approval: typeof approvals.$inferSelect,
  approverName: string,
  now: Date,
) {
  const notifyProvider = getNotifyProvider();

  // 获取创建人信息
  const creatorRows = await db.select().from(users).where(eq(users.id, filing.creatorId)).limit(1);
  const creator = creatorRows[0];

  // 重新获取审批链判断是否有下一级
  const orgProvider = getOrgProvider();
  const chain = await orgProvider.getBusinessApproverChain({
    creatorId: filing.creatorId,
    creatorDepartment: creator.department,
    creatorDomain: creator.domain,
    filingType: filing.type,
    amount: filing.amount,
  });

  if (approval.level < chain.length) {
    // 还有下一级业务审批
    const nextApprover = chain[approval.level]; // chain 0-indexed, level 1-indexed
    const nextApprovalId = generateId('approval');

    await db.insert(approvals).values({
      id: nextApprovalId,
      filingId: filing.id,
      approverId: nextApprover.userId,
      approverName: nextApprover.name,
      stage: 'business',
      level: approval.level + 1,
      status: 'pending',
    });

    const externalTodoId = await notifyProvider.pushTodo({
      approvalId: nextApprovalId,
      filingId: filing.id,
      filingTitle: filing.title,
      filingNumber: filing.filingNumber,
      approverUserId: nextApprover.userId,
      approverName: nextApprover.name,
      stage: 'business',
      level: approval.level + 1,
      creatorName: creator.name,
      amount: filing.amount,
      filingType: filing.type,
    });

    if (externalTodoId) {
      await db.update(approvals).set({ externalTodoId }).where(eq(approvals.id, nextApprovalId));
    }

    return { status: 'approved' as const, filingStatus: 'pending_business' as const };
  }

  // 业务侧全部通过 → 看是否有集团审批组
  const groups = (filing.approvalGroups ?? []) as ApprovalGroupName[];

  if (groups.length > 0) {
    return enterGroupStage(filing, groups, creator.name, now);
  }

  // 没有集团审批组 → 直接进入确认阶段
  return enterConfirmationStage(filing, creator.name, now);
}

/**
 * 进入集团审批组阶段:
 *   为每个勾选的审批组创建一条并行审批
 *   filing 状态 → pending_group
 */
async function enterGroupStage(
  filing: typeof filings.$inferSelect,
  groups: readonly ApprovalGroupName[],
  creatorName: string,
  now: Date,
) {
  const orgProvider = getOrgProvider();
  const notifyProvider = getNotifyProvider();

  const groupApprovers = await orgProvider.getGroupApprovers(groups);

  for (const ga of groupApprovers) {
    const approvalId = generateId('approval');

    await db.insert(approvals).values({
      id: approvalId,
      filingId: filing.id,
      approverId: ga.userId,
      approverName: ga.name,
      stage: 'group',
      level: 1,
      groupName: ga.groupName,
      status: 'pending',
    });

    const externalTodoId = await notifyProvider.pushTodo({
      approvalId,
      filingId: filing.id,
      filingTitle: filing.title,
      filingNumber: filing.filingNumber,
      approverUserId: ga.userId,
      approverName: ga.name,
      stage: 'group',
      level: 1,
      groupName: ga.groupName,
      creatorName,
      amount: filing.amount,
      filingType: filing.type,
    });

    if (externalTodoId) {
      await db.update(approvals).set({ externalTodoId }).where(eq(approvals.id, approvalId));
    }
  }

  await db.update(filings).set({ status: 'pending_group', updatedAt: now }).where(eq(filings.id, filing.id));

  return { status: 'approved' as const, filingStatus: 'pending_group' as const };
}

/**
 * 集团审批组审批完成检查:
 *   所有 group 审批都非 pending → 进入确认阶段
 *   否则等待
 */
async function handleGroupApproved(
  filing: typeof filings.$inferSelect,
  now: Date,
) {
  // 查看该 filing 的所有 group 审批
  const groupApprovals = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.filingId, filing.id), eq(approvals.stage, 'group')));

  const allDone = groupApprovals.every(a => a.status !== 'pending');

  if (!allDone) {
    // 还有 pending 的集团审批，等待
    return { status: 'approved' as const, filingStatus: 'pending_group' as const };
  }

  // 获取创建人名称
  const creatorRows = await db.select().from(users).where(eq(users.id, filing.creatorId)).limit(1);
  const creatorName = creatorRows[0]?.name ?? '';

  // 所有集团审批完成 → 进入确认阶段
  return enterConfirmationStage(filing, creatorName, now);
}

/**
 * 进入最终确认阶段:
 *   创建确认任务
 *   filing 状态 → pending_confirmation
 */
async function enterConfirmationStage(
  filing: typeof filings.$inferSelect,
  creatorName: string,
  now: Date,
) {
  const orgProvider = getOrgProvider();
  const notifyProvider = getNotifyProvider();

  const confirmer = await orgProvider.getConfirmationApprover();
  const approvalId = generateId('approval');

  await db.insert(approvals).values({
    id: approvalId,
    filingId: filing.id,
    approverId: confirmer.userId,
    approverName: confirmer.name,
    stage: 'confirmation',
    level: 1,
    status: 'pending',
  });

  const externalTodoId = await notifyProvider.pushTodo({
    approvalId,
    filingId: filing.id,
    filingTitle: filing.title,
    filingNumber: filing.filingNumber,
    approverUserId: confirmer.userId,
    approverName: confirmer.name,
    stage: 'confirmation',
    level: 1,
    creatorName,
    amount: filing.amount,
    filingType: filing.type,
  });

  if (externalTodoId) {
    await db.update(approvals).set({ externalTodoId }).where(eq(approvals.id, approvalId));
  }

  await db.update(filings).set({
    status: 'pending_confirmation',
    confirmedBy: confirmer.userId,
    updatedAt: now,
  }).where(eq(filings.id, filing.id));

  return { status: 'approved' as const, filingStatus: 'pending_confirmation' as const };
}

/**
 * 最终确认通过:
 *   filing → completed
 */
async function handleConfirmationApproved(
  filing: typeof filings.$inferSelect,
  confirmerId: string,
  now: Date,
  emailOptions?: EmailOptions,
) {
  await db.update(filings).set({
    status: 'completed',
    confirmedBy: confirmerId,
    completedAt: now,
    updatedAt: now,
  }).where(eq(filings.id, filing.id));

  // 发送完结邮件通知（失败不影响备案完成）
  if (!emailOptions?.skipEmail) {
    try {
      if (emailOptions?.emailOverrides) {
        await sendCompletionEmailWithOverrides(filing.id, emailOptions.emailOverrides);
      } else {
        await sendCompletionEmail(filing.id);
      }
    } catch (err) {
      console.error(`[Approval] 发送完结邮件失败:`, err);
    }
  }

  return { status: 'approved' as const, filingStatus: 'completed' as const };
}

// ─── 管理操作 ────────────────────────────────────────

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
    stage: approval.stage,
    level: approval.level,
    groupName: approval.groupName ?? undefined,
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
