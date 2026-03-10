import type { Domain } from '../types/filing.js';

/** 投资领域配置 */
export const DOMAIN_CONFIG: Record<Domain, {
  readonly label: string;
  readonly industries: readonly string[];
}> = {
  smart_living: {
    label: '智慧住居',
    industries: ['住居科技', '智能家居', '建筑科技'],
  },
  industrial_finance: {
    label: '产业金融',
    industries: ['金融投资', '融资租赁', '保理'],
  },
  health: {
    label: '大健康',
    industries: ['医疗科技', '生物制药', '健康管理'],
  },
} as const;

export const DOMAINS = Object.keys(DOMAIN_CONFIG) as readonly Domain[];
