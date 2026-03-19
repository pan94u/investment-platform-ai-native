import type { FilingType, ProjectStage, ApprovalGroupName } from '../types/filing.js';

/** 备案场景定义（5 类一级场景） */
export const FILING_TYPE_CONFIG: Record<FilingType, {
  readonly label: string;
  readonly description: string;
  readonly allowedStages: readonly ProjectStage[];
}> = {
  equity_direct: {
    label: '股权直投',
    description: '直接股权投资项目备案',
    allowedStages: ['invest', 'change', 'exit'],
  },
  fund_project: {
    label: '基金投项目',
    description: '通过基金投资的具体项目备案',
    allowedStages: ['invest', 'change'],
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
    allowedStages: ['invest', 'change', 'exit', 'other'],
  },
} as const;

export const FILING_TYPES = Object.keys(FILING_TYPE_CONFIG) as readonly FilingType[];

/** 项目阶段定义 */
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
  change: {
    label: '变更',
    amountHint: '请填写变更金额',
  },
  other: {
    label: '其它',
    amountHint: '不涉及金额请填 0',
  },
} as const;

export const PROJECT_STAGES = Object.keys(PROJECT_STAGE_CONFIG) as readonly ProjectStage[];

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
