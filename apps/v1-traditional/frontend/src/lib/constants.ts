export const FILING_TYPE_LABELS: Record<string, string> = {
  equity_direct: '股权直投',
  fund_project: '基金投项目',
  fund_investment: '基金投资',
  legal_entity: '法人新设',
  other: '其它',
};

export const PROJECT_STAGE_LABELS: Record<string, string> = {
  invest: '新增投资',
  exit: '项目退出',
  change: '变更',
  other: '其它',
};

/** 每种项目类型允许的阶段 */
export const TYPE_ALLOWED_STAGES: Record<string, string[]> = {
  equity_direct: ['invest', 'change', 'exit'],
  fund_project: ['invest', 'change'],
  fund_investment: ['invest', 'exit'],
  legal_entity: ['invest'],
  other: ['invest', 'change', 'exit', 'other'],
};

export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_business: '业务审批中',
  pending_group: '集团审批中',
  pending_confirmation: '待最终确认',
  completed: '已完成',
  rejected: '已驳回',
  recalled: '已撤回',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_business: 'bg-amber-50 text-amber-700',
  pending_group: 'bg-violet-50 text-violet-700',
  pending_confirmation: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
  recalled: 'bg-gray-100 text-gray-500',
};

export const DOMAIN_LABELS: Record<string, string> = {
  smart_living: '智慧住居',
  industrial_finance: '产业金融',
  health: '大健康',
};

export const APPROVAL_GROUP_LABELS: Record<string, string> = {
  finance: '集团财资',
  hr: '集团人力',
  strategy: '集团战略',
  legal: '集团法务',
  audit: '集团审计',
};

export const APPROVAL_GROUPS = ['finance', 'hr', 'strategy', 'legal', 'audit'] as const;

export const STAGE_LABELS: Record<string, string> = {
  business: '业务审批',
  group: '集团审批',
  confirmation: '最终确认',
};
