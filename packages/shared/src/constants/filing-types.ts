import type { FilingType, ProjectStage, ProjectCategory, ApprovalGroupName } from '../types/filing.js';

/** 备案场景定义（5 类一级场景） */
export const FILING_TYPE_CONFIG: Record<FilingType, {
  readonly label: string;
  readonly description: string;
  readonly allowedStages: readonly ProjectStage[];
}> = {
  equity_direct: {
    label: '股权直投',
    description: '直接股权投资项目备案',
    allowedStages: ['invest', 'exit'],
  },
  fund_project: {
    label: '基金投项目',
    description: '通过基金投资的具体项目备案',
    allowedStages: ['invest', 'exit'],
  },
  fund_investment: {
    label: '基金投资',
    description: '基金层面的投资备案',
    allowedStages: ['invest', 'exit'],
  },
  legal_entity: {
    label: '法人新设',
    description: '新设法人主体备案',
    allowedStages: ['invest'],
  },
  other: {
    label: '其它',
    description: '内部股权交易、土地/园区等其他备案',
    allowedStages: ['invest', 'exit'],
  },
} as const;

export const FILING_TYPES = Object.keys(FILING_TYPE_CONFIG) as readonly FilingType[];

/** 项目阶段定义（只保留投/退） */
export const PROJECT_STAGE_CONFIG: Record<ProjectStage, {
  readonly label: string;
  readonly amountHint: string;
}> = {
  invest: {
    label: '新增投资',
    amountHint: '请填写投资金额',
  },
  exit: {
    label: '项目退出',
    amountHint: '请填写退出金额',
  },
} as const;

export const PROJECT_STAGES = Object.keys(PROJECT_STAGE_CONFIG) as readonly ProjectStage[];

/** 项目类型定义（13 类 + 其他） */
export const PROJECT_CATEGORY_CONFIG: Record<ProjectCategory, {
  readonly label: string;
}> = {
  equity_direct_invest: { label: '股权直投' },
  fund_new: { label: '基金新设/出资' },
  fund_invest_project: { label: '基金投项目' },
  new_park_factory: { label: '新建园区/工厂' },
  land_asset: { label: '土地资产投资' },
  legal_entity_wholly: { label: '新设法人（全资）' },
  legal_entity_joint: { label: '新设法人（合资）' },
  external_equity_financing: { label: '对外股权融资' },
  investment_element_adjust: { label: '投资要素调整' },
  internal_transaction: { label: '内部交易类项目' },
  liquidation: { label: '清算类项目' },
  asset_project: { label: '资产类项目' },
  capital_increase: { label: '增资类项目' },
  other_category: { label: '其他' },
} as const;

export const PROJECT_CATEGORIES = Object.keys(PROJECT_CATEGORY_CONFIG) as readonly ProjectCategory[];

/** 集团审批组定义 */
export const APPROVAL_GROUP_CONFIG: Record<ApprovalGroupName, {
  readonly label: string;
  readonly defaultApprover: string;        // 默认审批人姓名（管理员可配置）
  readonly defaultApproverEmail: string;
}> = {
  finance: {
    label: '集团财资',
    defaultApprover: '张蕾',
    defaultApproverEmail: 'zhanglei.gxcw@haier.com',
  },
  hr: {
    label: '集团人力',
    defaultApprover: '杨阳',
    defaultApproverEmail: 'yangy.hr@haier.com',
  },
  strategy: {
    label: '集团战略',
    defaultApprover: '曹智',
    defaultApproverEmail: 'caozhi@haier.com',
  },
  legal: {
    label: '集团法务',
    defaultApprover: '王杰斯',
    defaultApproverEmail: 'wangjiesi@haier.com',
  },
  audit: {
    label: '集团审计',
    defaultApprover: '肖磊',
    defaultApproverEmail: 'xiaolei@haier.com',
  },
} as const;

export const APPROVAL_GROUPS = Object.keys(APPROVAL_GROUP_CONFIG) as readonly ApprovalGroupName[];

/** 固定备案邮件抄送名单（管理员可配置） */
export const DEFAULT_EMAIL_CC_LIST: Record<ApprovalGroupName, readonly { name: string; email: string }[]> = {
  finance: [
    { name: '宫伟', email: 'gongw@haier.com' },
    { name: '张蕾', email: 'zhanglei.gxcw@haier.com' },
  ],
  hr: [
    { name: '纪婷琪', email: 'jitq@haier.com' },
    { name: '杨阳', email: 'yangy.hr@haier.com' },
  ],
  strategy: [
    { name: '黄雯瑶', email: 'huangweny@haier.com' },
    { name: '徐妙晨', email: 'xumch@haier.com' },
    { name: '曹智', email: 'caozhi@haier.com' },
    { name: '赵远亮', email: 'zhaoyuanliang@haier.com' },
  ],
  legal: [
    { name: '张翠美', email: 'zhangcm@haier.com' },
    { name: '王杰斯', email: 'wangjiesi@haier.com' },
  ],
  audit: [
    { name: '李少华', email: 'lishaohua@haier.com' },
    { name: '肖磊', email: 'xiaolei@haier.com' },
  ],
} as const;
