import type { FilingStatus } from '../types/index.js';
import type { ApprovalStatus } from '../types/approval.js';

/** 备案状态配置 */
export const FILING_STATUS_CONFIG: Record<FilingStatus, {
  readonly label: string;
  readonly color: string;
}> = {
  draft: { label: '草稿', color: 'gray' },
  pending_business: { label: '业务审批中', color: 'orange' },
  pending_group: { label: '集团审批中', color: 'orange' },
  pending_confirmation: { label: '待最终确认', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
  recalled: { label: '已撤回', color: 'gray' },
} as const;

/** 审批状态配置 */
export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, {
  readonly label: string;
  readonly color: string;
}> = {
  pending: { label: '待审批', color: 'orange' },
  approved: { label: '已同意', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
  acknowledged: { label: '已知悉', color: 'blue' },
} as const;
