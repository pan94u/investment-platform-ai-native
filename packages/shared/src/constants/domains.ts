/**
 * @deprecated 领域/行业已改为从 org 表动态加载，不再硬编码
 * 保留此文件仅为兼容旧引用，实际数据从 /api/org/domains 和 /api/org/industries 获取
 */

export const DOMAIN_CONFIG: Record<string, { readonly label: string; readonly industries: readonly string[] }> = {};
export const DOMAINS: readonly string[] = [];
