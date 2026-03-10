import type { FilingType } from '../types/filing.js';

/** 备案场景定义 */
export const FILING_TYPE_CONFIG: Record<FilingType, {
  readonly label: string;
  readonly description: string;
}> = {
  direct_investment: {
    label: '直投投资',
    description: '直接投资项目备案',
  },
  earnout_change: {
    label: '对赌变更',
    description: '对赌目标/条件变更备案',
  },
  fund_exit: {
    label: '基金投退出',
    description: '基金投资项目退出备案',
  },
  legal_entity_setup: {
    label: '法人新设',
    description: '新设法人主体备案',
  },
  other_change: {
    label: '其他投资要素变更',
    description: '其他投资要素变更备案',
  },
} as const;

export const FILING_TYPES = Object.keys(FILING_TYPE_CONFIG) as readonly FilingType[];
