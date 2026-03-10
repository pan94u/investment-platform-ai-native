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
  submitted: 'bg-indigo-100 text-indigo-700',
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

export const RISK_LABELS: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-red-100 text-red-700 border-red-200',
};

export const RISK_DOT_COLORS: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export const FIELD_SOURCE_LABELS: Record<string, string> = {
  ai_extract: 'AI提取',
  ai_prefill: 'AI预填',
  user_input: '用户输入',
  user_modified: '用户修改',
  system_auto: '系统自动',
  doc_extract: '文档提取',
};

export const FIELD_SOURCE_COLORS: Record<string, string> = {
  ai_extract: 'bg-violet-100 text-violet-600',
  ai_prefill: 'bg-indigo-100 text-indigo-600',
  user_input: 'bg-gray-100 text-gray-600',
  user_modified: 'bg-amber-100 text-amber-600',
  system_auto: 'bg-sky-100 text-sky-600',
  doc_extract: 'bg-teal-100 text-teal-600',
};
