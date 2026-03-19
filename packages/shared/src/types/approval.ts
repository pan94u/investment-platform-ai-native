import type { ApprovalGroupName } from './filing.js';

/** 审批阶段 */
export type ApprovalStage =
  | 'business'             // 业务侧逐级审批
  | 'group'                // 集团审批组
  | 'confirmation';        // 最终确认

/** 审批状态 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'acknowledged';

/** 审批操作 */
export type ApprovalAction = 'approve' | 'reject' | 'acknowledge';

/** 审批记录 */
export interface Approval {
  readonly id: string;
  readonly filingId: string;
  readonly approverId: string;
  readonly approverName: string;
  readonly stage: ApprovalStage;
  readonly level: number;                              // 业务侧: 1,2,3...  集团/确认: 1
  readonly groupName: ApprovalGroupName | null;        // 仅 group 阶段有值
  readonly status: ApprovalStatus;
  readonly comment: string | null;
  readonly createdAt: Date;
  readonly decidedAt: Date | null;
  readonly reassignedFrom: string | null;
  readonly externalTodoId: string | null;
}

/** 审批操作请求 */
export interface ApprovalActionRequest {
  readonly action: ApprovalAction;
  readonly comment?: string;
}

/** 审批待办项 */
export interface ApprovalTodoItem {
  readonly approvalId: string;
  readonly filingId: string;
  readonly filingNumber: string;
  readonly filingTitle: string;
  readonly filingType: string;
  readonly creatorName: string;
  readonly domain: string;
  readonly amount: number;
  readonly stage: ApprovalStage;
  readonly level: number;
  readonly groupName: ApprovalGroupName | null;
  readonly submittedAt: Date;
}
