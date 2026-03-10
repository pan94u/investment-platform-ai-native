/** 数据洞察 */
export interface Insight {
  readonly id: string;
  readonly type: 'trend' | 'anomaly' | 'baseline_warning' | 'summary';
  readonly severity: 'info' | 'warning' | 'critical';
  readonly title: string;
  readonly description: string;
  readonly data: Record<string, unknown>;
  readonly generatedAt: Date;
}

/** 看板统计 */
export interface DashboardStats {
  readonly totalFilings: number;
  readonly totalAmount: number;
  readonly byStatus: Record<string, number>;
  readonly byType: Record<string, number>;
  readonly byDomain: Record<string, number>;
  readonly byMonth: readonly MonthlyStats[];
  readonly avgApprovalHours: number;
  readonly pendingCount: number;
}

/** 月度统计 */
export interface MonthlyStats {
  readonly month: string;
  readonly count: number;
  readonly amount: number;
}

/** 趋势分析 */
export interface TrendAnalysis {
  readonly period: string;
  readonly filingCount: number;
  readonly filingCountChange: number; // vs 上期百分比
  readonly totalAmount: number;
  readonly amountChange: number;
  readonly topDomains: readonly DomainStat[];
  readonly topTypes: readonly TypeStat[];
}

/** 领域统计 */
export interface DomainStat {
  readonly domain: string;
  readonly count: number;
  readonly amount: number;
  readonly percentage: number;
}

/** 类型统计 */
export interface TypeStat {
  readonly type: string;
  readonly count: number;
  readonly amount: number;
  readonly percentage: number;
}

/** 异常检测结果 */
export interface AnomalyDetection {
  readonly anomalies: readonly Anomaly[];
  readonly checkedAt: Date;
}

/** 单个异常 */
export interface Anomaly {
  readonly id: string;
  readonly type: 'amount_threshold' | 'frequency_spike' | 'clawback_repeat' | 'domain_concentration';
  readonly severity: 'warning' | 'critical';
  readonly title: string;
  readonly description: string;
  readonly relatedFilings: readonly string[];
  readonly metric: string;
  readonly threshold: number;
  readonly actual: number;
}

/** 底线预警 */
export interface BaselineWarning {
  readonly id: string;
  readonly rule: string;
  readonly level: 'warning' | 'critical';
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly triggeredAt: Date;
}

/** 对话查询结果 */
export interface QueryResult {
  readonly query: string;
  readonly answer: string;
  readonly data: readonly Record<string, unknown>[];
  readonly sqlGenerated?: string;
  readonly confidence: number;
}

/** 周期性报告 */
export interface PeriodicReport {
  readonly id: string;
  readonly type: 'weekly' | 'monthly';
  readonly period: string;
  readonly summary: string;
  readonly insights: readonly Insight[];
  readonly stats: DashboardStats;
  readonly generatedAt: Date;
}
