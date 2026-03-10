/** 审批级别 */
export type ApprovalLevel = 1 | 2;  // 1=直属上级, 2=集团审批

/** 审批状态 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** 审批记录 */
export interface Approval {
  readonly id: string;
  readonly filingId: string;
  readonly approverId: string;
  readonly approverName: string;
  readonly level: ApprovalLevel;
  readonly status: ApprovalStatus;
  readonly comment: string | null;
  readonly createdAt: Date;
  readonly decidedAt: Date | null;
}

/** 审批操作请求 */
export interface ApprovalActionRequest {
  readonly action: 'approve' | 'reject';
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
  readonly level: ApprovalLevel;
  readonly submittedAt: Date;
}
