import type { FilingStatus, ApprovalStatus } from '../types/index.js';

/** 备案状态配置 */
export const FILING_STATUS_CONFIG: Record<FilingStatus, {
  readonly label: string;
  readonly color: string;
}> = {
  draft: { label: '草稿', color: 'gray' },
  submitted: { label: '已提交', color: 'blue' },
  pending_level1: { label: '待上级审批', color: 'orange' },
  pending_level2: { label: '待集团审批', color: 'orange' },
  approved: { label: '已通过', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
  completed: { label: '已完成', color: 'green' },
} as const;

/** 审批状态配置 */
export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, {
  readonly label: string;
  readonly color: string;
}> = {
  pending: { label: '待审批', color: 'orange' },
  approved: { label: '已同意', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
} as const;
