/** 审批节点配置 */
export interface ApprovalGroupConfig {
  readonly id: string;
  readonly groupName: string;
  readonly userId: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** 固定邮件抄送配置 */
export interface EmailCcConfig {
  readonly id: string;
  readonly groupName: string;
  readonly name: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
}
