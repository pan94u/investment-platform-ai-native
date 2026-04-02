import type { User } from './user.js';

/** 备案一级场景（项目类型） */
export type FilingType =
  | 'equity_direct'        // 股权直投
  | 'fund_project'         // 基金投项目
  | 'fund_investment'      // 基金投资
  | 'legal_entity'         // 法人新设
  | 'other';               // 其它

/** 项目阶段 */
export type ProjectStage =
  | 'invest'               // 新增投资 / 新设
  | 'exit'                 // 退出
  | 'change'               // 变更（对赌变更等）
  | 'other';               // 其它

/** 备案状态 */
export type FilingStatus =
  | 'draft'                    // 草稿
  | 'pending_business'         // 业务侧审批中（逐级上溯）
  | 'pending_group'            // 集团审批组审批中
  | 'pending_confirmation'     // 待最终确认
  | 'completed'                // 已完成
  | 'rejected'                 // 已驳回
  | 'recalled';                // 已撤回

/** 风险等级 (V3+) */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 投资领域（动态，来自 org 表 field_name） */
export type Domain = string;

/** 集团审批组名称 */
export type ApprovalGroupName =
  | 'finance'              // 集团财资
  | 'hr'                   // 集团人力
  | 'strategy'             // 集团战略
  | 'legal'                // 集团法务
  | 'audit';               // 集团审计

/** 备案核心数据 */
export interface Filing {
  readonly id: string;
  readonly filingNumber: string;          // BG 编号, e.g. BG20260301-005
  readonly type: FilingType;
  readonly projectStage: ProjectStage;
  readonly title: string;                 // 项目说明（一句话摘要）
  readonly description: string;           // 备案具体事项

  // 项目信息
  readonly projectName: string;
  readonly legalEntityName: string | null;
  readonly domain: Domain;
  readonly industry: string;

  // 金额
  readonly amount: number;                // 万元
  readonly currency: string;              // CNY

  // 直投专有字段
  readonly investmentRatio: number | null;    // 投资比例 %
  readonly valuationAmount: number | null;    // 估值金额（万元）

  // 对赌变更专有字段
  readonly originalTarget: number | null;     // 原对赌目标（万元）
  readonly newTarget: number | null;          // 新对赌目标（万元）
  readonly changeReason: string | null;       // 变更原因

  // 流程相关
  readonly approvalGroups: readonly ApprovalGroupName[];   // 发起人勾选的审批组
  readonly emailRecipients: readonly string[];             // 备案邮件业务收件人（userId[]）
  readonly confirmedBy: string | null;                     // 最终确认人 userId

  // 状态
  readonly status: FilingStatus;
  readonly riskLevel: RiskLevel | null;       // V3+ 风险评估

  // 项目编号
  readonly projectCode: string | null;

  // 关联
  readonly creatorId: string;
  readonly creator?: User;

  // 时间
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly submittedAt: Date | null;
  readonly completedAt: Date | null;
  readonly filingTime: Date | null;              // 备案时间=邮件发出时间
}

/** 创建备案请求 */
export interface CreateFilingRequest {
  readonly type: FilingType;
  readonly projectStage: ProjectStage;
  readonly title: string;
  readonly description: string;
  readonly projectName: string;
  readonly legalEntityName?: string;
  readonly domain: Domain;
  readonly industry: string;
  readonly amount: number;
  readonly currency?: string;
  readonly investmentRatio?: number;
  readonly valuationAmount?: number;
  readonly originalTarget?: number;
  readonly newTarget?: number;
  readonly changeReason?: string;
  readonly approvalGroups?: readonly ApprovalGroupName[];
  readonly emailRecipients?: readonly string[];
  readonly projectCode?: string;
}

/** 更新备案请求 */
export interface UpdateFilingRequest extends Partial<CreateFilingRequest> {}

/** 备案查询参数 */
export interface FilingQueryParams {
  readonly type?: FilingType;
  readonly projectStage?: ProjectStage;
  readonly status?: FilingStatus;
  readonly domain?: Domain;
  readonly creatorId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly keyword?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}
