import type { User } from './user.js';

/** 备案场景类型 */
export type FilingType =
  | 'direct_investment'      // 直投投资
  | 'earnout_change'         // 对赌变更
  | 'fund_exit'              // 基金投退出
  | 'legal_entity_setup'     // 法人新设
  | 'other_change';          // 其他投资要素变更

/** 备案状态 */
export type FilingStatus =
  | 'draft'                  // 草稿
  | 'submitted'              // 已提交
  | 'pending_level1'         // 待直属上级审批
  | 'pending_level2'         // 待集团审批
  | 'approved'               // 已通过
  | 'rejected'               // 已驳回
  | 'completed';             // 已完成

/** 风险等级 (V3+) */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 投资领域 */
export type Domain = 'smart_living' | 'industrial_finance' | 'health';

/** 备案核心数据 */
export interface Filing {
  readonly id: string;
  readonly filingNumber: string;          // BG 编号, e.g. BG20260301-005
  readonly type: FilingType;
  readonly title: string;
  readonly description: string;

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

  // 状态
  readonly status: FilingStatus;
  readonly riskLevel: RiskLevel | null;       // V3+ 风险评估

  // 关联
  readonly creatorId: string;
  readonly creator?: User;

  // 时间
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly submittedAt: Date | null;
  readonly completedAt: Date | null;
}

/** 创建备案请求 */
export interface CreateFilingRequest {
  readonly type: FilingType;
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
}

/** 更新备案请求 */
export interface UpdateFilingRequest extends Partial<CreateFilingRequest> {}

/** 备案查询参数 */
export interface FilingQueryParams {
  readonly type?: FilingType;
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
