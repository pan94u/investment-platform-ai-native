export const FILING_TYPE_LABELS: Record<string, string> = {
  direct_investment: '直投投资',
  earnout_change: '对赌变更',
  fund_exit: '基金投退出',
  legal_entity_setup: '法人新设',
  other_change: '其他投资要素变更',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  pending_level1: '待上级审批',
  pending_level2: '待集团审批',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  pending_level1: 'bg-orange-100 text-orange-700',
  pending_level2: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
};

export const DOMAIN_LABELS: Record<string, string> = {
  smart_living: '智慧住居',
  industrial_finance: '产业金融',
  health: '大健康',
};
