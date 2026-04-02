import type { ApprovalGroupName } from '@filing/shared';

/** 审批链中的单个审批人（业务侧） */
export interface ApproverInfo {
  readonly userId: string;
  readonly name: string;
  readonly level: number; // 1-based, 业务侧顺序
}

/** 集团审批组审批人 */
export interface GroupApproverInfo {
  readonly userId: string;
  readonly name: string;
  readonly groupName: ApprovalGroupName;
}

/** 最终确认人 */
export interface ConfirmationInfo {
  readonly userId: string;
  readonly name: string;
}

/** 获取审批链时的上下文 */
export interface ApproverChainContext {
  readonly creatorId: string;
  readonly creatorDepartment: string;
  readonly creatorDomain: string;
  readonly filingType: string;
  readonly amount: string;
}

/**
 * 组织数据提供者
 * PoC: DatabaseOrgProvider (查本地 users 表)
 * 生产: 对接集团组织中心 API
 */
export interface OrgProvider {
  /** 获取业务侧审批链（逐级上溯: 直线→二线→...→平台主） */
  getBusinessApproverChain(ctx: ApproverChainContext): Promise<readonly ApproverInfo[]>;

  /** 获取集团审批组审批人 */
  getGroupApprovers(groupNames: readonly ApprovalGroupName[]): Promise<readonly GroupApproverInfo[]>;

  /** 获取最终确认人 */
  getConfirmationApprover(): Promise<ConfirmationInfo>;
}

/** 推送待办时的数据载体 */
export interface TodoPayload {
  readonly approvalId: string;
  readonly filingId: string;
  readonly filingTitle: string;
  readonly filingNumber: string;
  readonly approverUserId: string;
  readonly approverName: string;
  readonly stage: string;
  readonly level: number;
  readonly groupName?: string;
  readonly creatorName: string;
  readonly amount: string;
  readonly filingType: string;
}

/**
 * 通知提供者
 * PoC: MockNotifyProvider (console.log)
 * 生产: FeishuNotifyProvider (飞书待办 API)
 */
export interface NotifyProvider {
  pushTodo(payload: TodoPayload): Promise<string | null>; // returns externalTodoId
  updateTodo(externalTodoId: string, update: Record<string, string>): Promise<void>;
  closeTodo(externalTodoId: string, result: 'approved' | 'rejected' | 'recalled' | 'acknowledged'): Promise<void>;
}

/** 邮件载荷 */
export interface EmailPayload {
  readonly to: string[];       // 邮箱地址
  readonly cc: string[];
  readonly subject: string;
  readonly htmlBody: string;
  readonly attachments: readonly { filename: string; path: string; mimeType: string }[];
}

/** 邮件提供者 */
export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<boolean>;
}
