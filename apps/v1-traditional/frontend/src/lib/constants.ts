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
};

/** 每种备案类型允许的阶段（只保留投/退） */
export const TYPE_ALLOWED_STAGES: Record<string, string[]> = {
  equity_direct: ['invest', 'exit'],
  fund_project: ['invest', 'exit'],
  fund_investment: ['invest', 'exit'],
  legal_entity: ['invest'],
  other: ['invest', 'exit'],
};

/** 项目类型标签（13 + 其他） */
export const PROJECT_CATEGORY_LABELS: Record<string, string> = {
  equity_direct_invest: '股权直投',
  fund_new: '基金新设/出资',
  fund_invest_project: '基金投项目',
  new_park_factory: '新建园区/工厂',
  land_asset: '土地资产投资',
  legal_entity_wholly: '新设法人（全资）',
  legal_entity_joint: '新设法人（合资）',
  external_equity_financing: '对外股权融资',
  investment_element_adjust: '投资要素调整',
  internal_transaction: '内部交易类项目',
  liquidation: '清算类项目',
  asset_project: '资产类项目',
  capital_increase: '增资类项目',
  other_category: '其他',
};

/** 金额字段 tooltip */
export const AMOUNT_TOOLTIP = '新增投资→填投资金额 / 项目退出→填退出金额 / 不涉及→填0';

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

/**
 * @deprecated 领域已改为动态加载，此处保留空对象兼容旧代码
 * 实际数据从 /api/org/domains 获取
 */
export const DOMAIN_LABELS: Record<string, string> = {};

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
