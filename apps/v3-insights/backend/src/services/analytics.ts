import { eq, sql, desc, count, sum, gte, lte, and } from 'drizzle-orm';
import { filings, approvals } from '@filing/database';
import type {
  DashboardStats,
  MonthlyStats,
  TrendAnalysis,
  DomainStat,
  TypeStat,
  AnomalyDetection,
  Anomaly,
  BaselineWarning,
  Insight,
} from '@filing/shared';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';

// --- Domain & type label maps ---

const domainLabels: Record<string, string> = {
  smart_living: '智慧住居',
  industrial_finance: '产业金融',
  health: '大健康',
};

const typeLabels: Record<string, string> = {
  direct_investment: '直投投资',
  earnout_change: '对赌变更',
  fund_exit: '基金投退出',
  legal_entity_setup: '法人新设',
  other_change: '其他变更',
};

// ============================================================
// getDashboardStats — 综合看板统计
// ============================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  // Total filings count
  const totalResult = await db.select({ cnt: count() }).from(filings);
  const totalFilings = totalResult[0]?.cnt ?? 0;

  // Total amount
  const amountResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text` })
    .from(filings);
  const totalAmount = Number(amountResult[0]?.total ?? '0');

  // By status
  const statusRows = await db
    .select({ status: filings.status, cnt: count() })
    .from(filings)
    .groupBy(filings.status);
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.cnt;

  // By type
  const typeRows = await db
    .select({ type: filings.type, cnt: count() })
    .from(filings)
    .groupBy(filings.type);
  const byType: Record<string, number> = {};
  for (const r of typeRows) byType[r.type] = r.cnt;

  // By domain
  const domainRows = await db
    .select({ domain: filings.domain, cnt: count() })
    .from(filings)
    .groupBy(filings.domain);
  const byDomain: Record<string, number> = {};
  for (const r of domainRows) byDomain[r.domain] = r.cnt;

  // Monthly stats (last 12 months)
  const monthlyRows = await db
    .select({
      month: sql<string>`to_char(${filings.createdAt}, 'YYYY-MM')`,
      cnt: count(),
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .where(gte(filings.createdAt, sql`NOW() - INTERVAL '12 months'`))
    .groupBy(sql`to_char(${filings.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${filings.createdAt}, 'YYYY-MM')`);

  const byMonth: MonthlyStats[] = monthlyRows.map((r) => ({
    month: r.month,
    count: r.cnt,
    amount: Number(r.amt),
  }));

  // Average approval time (hours) for completed filings
  const avgResult = await db
    .select({
      avgHours: sql<string>`COALESCE(
        AVG(EXTRACT(EPOCH FROM (${filings.completedAt} - ${filings.submittedAt})) / 3600),
        0
      )::text`,
    })
    .from(filings)
    .where(
      and(
        eq(filings.status, 'completed'),
        sql`${filings.completedAt} IS NOT NULL`,
        sql`${filings.submittedAt} IS NOT NULL`
      )
    );
  const avgApprovalHours = Math.round(Number(avgResult[0]?.avgHours ?? '0') * 10) / 10;

  // Pending count
  const pendingResult = await db
    .select({ cnt: count() })
    .from(filings)
    .where(
      sql`${filings.status} IN ('pending_level1', 'pending_level2')`
    );
  const pendingCount = pendingResult[0]?.cnt ?? 0;

  return {
    totalFilings,
    totalAmount,
    byStatus,
    byType,
    byDomain,
    byMonth,
    avgApprovalHours,
    pendingCount,
  };
}

// ============================================================
// getTrendAnalysis — 趋势分析（周/月）
// ============================================================

export async function getTrendAnalysis(period: 'weekly' | 'monthly'): Promise<TrendAnalysis> {
  const now = new Date();

  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;
  let periodLabel: string;

  if (period === 'weekly') {
    // Current week: last 7 days
    currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    previousEnd = new Date(currentStart.getTime());
    previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    periodLabel = `${currentStart.toISOString().slice(0, 10)} ~ ${now.toISOString().slice(0, 10)}`;
  } else {
    // Current month
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    previousEnd = new Date(currentStart.getTime());
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    periodLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Current period stats
  const currentStats = await db
    .select({
      cnt: count(),
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .where(gte(filings.createdAt, currentStart));

  // Previous period stats
  const prevStats = await db
    .select({
      cnt: count(),
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .where(and(gte(filings.createdAt, previousStart), lte(filings.createdAt, previousEnd)));

  const currentCount = currentStats[0]?.cnt ?? 0;
  const currentAmount = Number(currentStats[0]?.amt ?? '0');
  const prevCount = prevStats[0]?.cnt ?? 0;
  const prevAmount = Number(prevStats[0]?.amt ?? '0');

  const filingCountChange = prevCount > 0 ? Math.round(((currentCount - prevCount) / prevCount) * 100) : currentCount > 0 ? 100 : 0;
  const amountChange = prevAmount > 0 ? Math.round(((currentAmount - prevAmount) / prevAmount) * 100) : currentAmount > 0 ? 100 : 0;

  // Top domains (current period)
  const domainRows = await db
    .select({
      domain: filings.domain,
      cnt: count(),
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .where(gte(filings.createdAt, currentStart))
    .groupBy(filings.domain)
    .orderBy(sql`SUM(${filings.amount}::numeric) DESC`);

  const domainTotal = domainRows.reduce((s, r) => s + Number(r.amt), 0);
  const topDomains: DomainStat[] = domainRows.map((r) => ({
    domain: domainLabels[r.domain] ?? r.domain,
    count: r.cnt,
    amount: Number(r.amt),
    percentage: domainTotal > 0 ? Math.round((Number(r.amt) / domainTotal) * 100) : 0,
  }));

  // Top types (current period)
  const typeRows = await db
    .select({
      type: filings.type,
      cnt: count(),
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .where(gte(filings.createdAt, currentStart))
    .groupBy(filings.type)
    .orderBy(sql`SUM(${filings.amount}::numeric) DESC`);

  const typeTotal = typeRows.reduce((s, r) => s + Number(r.amt), 0);
  const topTypes: TypeStat[] = typeRows.map((r) => ({
    type: typeLabels[r.type] ?? r.type,
    count: r.cnt,
    amount: Number(r.amt),
    percentage: typeTotal > 0 ? Math.round((Number(r.amt) / typeTotal) * 100) : 0,
  }));

  return {
    period: periodLabel,
    filingCount: currentCount,
    filingCountChange,
    totalAmount: currentAmount,
    amountChange,
    topDomains,
    topTypes,
  };
}

// ============================================================
// getAnomalyDetection — 异常检测
// ============================================================

export async function getAnomalyDetection(): Promise<AnomalyDetection> {
  const anomalies: Anomaly[] = [];

  // 1. amount_threshold: any filing > 50000万元 (5亿)
  const highAmountFilings = await db
    .select({
      id: filings.id,
      title: filings.title,
      projectName: filings.projectName,
      amount: filings.amount,
    })
    .from(filings)
    .where(sql`${filings.amount}::numeric > 50000`);

  for (const f of highAmountFilings) {
    anomalies.push({
      id: generateId('anomaly'),
      type: 'amount_threshold',
      severity: 'critical',
      title: `大额投资预警：${f.projectName}`,
      description: `备案"${f.title}"金额为${Number(f.amount)}万元，超过5亿元阈值，需要重点关注。`,
      relatedFilings: [f.id],
      metric: `${Number(f.amount)}万元`,
      threshold: 50000,
      actual: Number(f.amount),
    });
  }

  // 2. frequency_spike: > 3 filings for same project in 6 months
  const frequencyRows = await db
    .select({
      projectName: filings.projectName,
      cnt: count(),
      ids: sql<string>`array_agg(${filings.id})::text`,
    })
    .from(filings)
    .where(gte(filings.createdAt, sql`NOW() - INTERVAL '6 months'`))
    .groupBy(filings.projectName)
    .having(sql`COUNT(*) > 3`);

  for (const r of frequencyRows) {
    const ids = r.ids.replace(/[{}]/g, '').split(',').map((s: string) => s.trim());
    anomalies.push({
      id: generateId('anomaly'),
      type: 'frequency_spike',
      severity: 'warning',
      title: `高频备案预警：${r.projectName}`,
      description: `项目"${r.projectName}"在近6个月内提交了${r.cnt}次备案，超过3次阈值，可能存在异常。`,
      relatedFilings: ids,
      metric: `${r.cnt}次/6个月`,
      threshold: 3,
      actual: r.cnt,
    });
  }

  // 3. clawback_repeat: project with >1 earnout_change in 12 months
  const clawbackRows = await db
    .select({
      projectName: filings.projectName,
      cnt: count(),
      ids: sql<string>`array_agg(${filings.id})::text`,
    })
    .from(filings)
    .where(
      and(
        eq(filings.type, 'earnout_change'),
        gte(filings.createdAt, sql`NOW() - INTERVAL '12 months'`)
      )
    )
    .groupBy(filings.projectName)
    .having(sql`COUNT(*) > 1`);

  for (const r of clawbackRows) {
    const ids = r.ids.replace(/[{}]/g, '').split(',').map((s: string) => s.trim());
    anomalies.push({
      id: generateId('anomaly'),
      type: 'clawback_repeat',
      severity: 'critical',
      title: `重复对赌变更预警：${r.projectName}`,
      description: `项目"${r.projectName}"在12个月内发生了${r.cnt}次对赌变更，需要重点审查对赌条款执行情况。`,
      relatedFilings: ids,
      metric: `${r.cnt}次对赌变更/12个月`,
      threshold: 1,
      actual: r.cnt,
    });
  }

  // 4. domain_concentration: single domain > 60% of total amount
  const domainAmounts = await db
    .select({
      domain: filings.domain,
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .groupBy(filings.domain);

  const totalAmt = domainAmounts.reduce((s, r) => s + Number(r.amt), 0);
  for (const r of domainAmounts) {
    const amt = Number(r.amt);
    const pct = totalAmt > 0 ? (amt / totalAmt) * 100 : 0;
    if (pct > 60) {
      const label = domainLabels[r.domain] ?? r.domain;
      anomalies.push({
        id: generateId('anomaly'),
        type: 'domain_concentration',
        severity: 'warning',
        title: `领域集中度预警：${label}`,
        description: `${label}领域投资金额占总额的${Math.round(pct)}%，超过60%集中度阈值，建议分散投资风险。`,
        relatedFilings: [],
        metric: `${Math.round(pct)}%`,
        threshold: 60,
        actual: Math.round(pct * 10) / 10,
      });
    }
  }

  return {
    anomalies,
    checkedAt: new Date(),
  };
}

// ============================================================
// getBaselineWarnings — 底线预警
// ============================================================

export async function getBaselineWarnings(): Promise<BaselineWarning[]> {
  const warnings: BaselineWarning[] = [];

  // 1. Cumulative clawback decline > 50%
  // For each project with earnout_change, check if total decline > 50%
  const clawbackProjects = await db
    .select({
      projectName: filings.projectName,
      originalTarget: filings.originalTarget,
      newTarget: filings.newTarget,
      createdAt: filings.createdAt,
    })
    .from(filings)
    .where(eq(filings.type, 'earnout_change'))
    .orderBy(filings.createdAt);

  // Group by project, find the earliest originalTarget and latest newTarget
  const projectClawbacks: Record<string, { firstOriginal: number; latestNew: number }> = {};
  for (const row of clawbackProjects) {
    const project = row.projectName;
    const original = Number(row.originalTarget ?? 0);
    const newVal = Number(row.newTarget ?? 0);
    if (!projectClawbacks[project]) {
      projectClawbacks[project] = { firstOriginal: original, latestNew: newVal };
    } else {
      // Keep the first original, update latest new
      projectClawbacks[project].latestNew = newVal;
    }
  }

  for (const [project, data] of Object.entries(projectClawbacks)) {
    if (data.firstOriginal > 0) {
      const declinePct = ((data.firstOriginal - data.latestNew) / data.firstOriginal) * 100;
      if (declinePct > 50) {
        warnings.push({
          id: generateId('warning'),
          rule: '对赌目标累计下降超50%',
          level: 'critical',
          message: `${project}：对赌目标从${data.firstOriginal}万元降至${data.latestNew}万元，累计下降${Math.round(declinePct)}%，超过50%底线。`,
          details: {
            projectName: project,
            firstOriginal: data.firstOriginal,
            latestNew: data.latestNew,
            declinePercentage: Math.round(declinePct),
          },
          triggeredAt: new Date(),
        });
      }
    }
  }

  // 2. Domain concentration exceeding thresholds
  const domainAmounts = await db
    .select({
      domain: filings.domain,
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .groupBy(filings.domain);

  const totalAmt = domainAmounts.reduce((s, r) => s + Number(r.amt), 0);
  for (const r of domainAmounts) {
    const amt = Number(r.amt);
    const pct = totalAmt > 0 ? (amt / totalAmt) * 100 : 0;
    const label = domainLabels[r.domain] ?? r.domain;
    if (pct > 70) {
      warnings.push({
        id: generateId('warning'),
        rule: '领域集中度超过70%',
        level: 'critical',
        message: `${label}领域投资金额占比${Math.round(pct)}%，超过70%底线阈值，存在集中风险。`,
        details: { domain: r.domain, domainLabel: label, amount: amt, percentage: Math.round(pct) },
        triggeredAt: new Date(),
      });
    } else if (pct > 50) {
      warnings.push({
        id: generateId('warning'),
        rule: '领域集中度超过50%',
        level: 'warning',
        message: `${label}领域投资金额占比${Math.round(pct)}%，超过50%预警阈值，建议关注。`,
        details: { domain: r.domain, domainLabel: label, amount: amt, percentage: Math.round(pct) },
        triggeredAt: new Date(),
      });
    }
  }

  // 3. Pending approvals overdue (> 72 hours)
  const overdueApprovals = await db
    .select({
      approvalId: approvals.id,
      filingId: approvals.filingId,
      filingTitle: filings.title,
      projectName: filings.projectName,
      approverName: approvals.approverName,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .innerJoin(filings, eq(approvals.filingId, filings.id))
    .where(
      and(
        eq(approvals.status, 'pending'),
        sql`${approvals.createdAt} < NOW() - INTERVAL '72 hours'`
      )
    );

  for (const row of overdueApprovals) {
    const hoursAgo = Math.round(
      (Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60)
    );
    warnings.push({
      id: generateId('warning'),
      rule: '审批超时（>72小时）',
      level: 'warning',
      message: `备案"${row.filingTitle}"（${row.projectName}）已等待审批${hoursAgo}小时，审批人：${row.approverName}。`,
      details: {
        approvalId: row.approvalId,
        filingId: row.filingId,
        filingTitle: row.filingTitle,
        approverName: row.approverName,
        waitingHours: hoursAgo,
      },
      triggeredAt: new Date(),
    });
  }

  return warnings;
}

// ============================================================
// getProjectHistory — 项目备案历史
// ============================================================

export async function getProjectHistory(projectName: string) {
  const rows = await db
    .select()
    .from(filings)
    .where(eq(filings.projectName, projectName))
    .orderBy(desc(filings.createdAt));

  return rows;
}

// ============================================================
// generateInsights — 综合洞察生成
// ============================================================

export async function generateInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];

  // 1. Get dashboard stats for summary
  const stats = await getDashboardStats();

  insights.push({
    id: generateId('insight'),
    type: 'summary',
    severity: 'info',
    title: '投资备案总览',
    description: `当前共有${stats.totalFilings}笔备案，总金额${stats.totalAmount}万元。其中${stats.pendingCount}笔待审批，平均审批时长${stats.avgApprovalHours}小时。`,
    data: {
      totalFilings: stats.totalFilings,
      totalAmount: stats.totalAmount,
      pendingCount: stats.pendingCount,
      avgApprovalHours: stats.avgApprovalHours,
    },
    generatedAt: new Date(),
  });

  // 2. Trend insight
  const trend = await getTrendAnalysis('monthly');
  if (trend.filingCount > 0) {
    const changeDir = trend.filingCountChange > 0 ? '增长' : trend.filingCountChange < 0 ? '下降' : '持平';
    insights.push({
      id: generateId('insight'),
      type: 'trend',
      severity: Math.abs(trend.amountChange) > 50 ? 'warning' : 'info',
      title: `本月备案趋势${changeDir}`,
      description: `本月新增${trend.filingCount}笔备案，较上月${changeDir}${Math.abs(trend.filingCountChange)}%；金额${trend.totalAmount}万元，较上月变化${trend.amountChange}%。`,
      data: {
        filingCount: trend.filingCount,
        filingCountChange: trend.filingCountChange,
        totalAmount: trend.totalAmount,
        amountChange: trend.amountChange,
      },
      generatedAt: new Date(),
    });
  }

  // 3. Anomaly insights
  const anomalyResult = await getAnomalyDetection();
  for (const anomaly of anomalyResult.anomalies) {
    insights.push({
      id: generateId('insight'),
      type: 'anomaly',
      severity: anomaly.severity === 'critical' ? 'critical' : 'warning',
      title: anomaly.title,
      description: anomaly.description,
      data: {
        anomalyType: anomaly.type,
        metric: anomaly.metric,
        threshold: anomaly.threshold,
        actual: anomaly.actual,
        relatedFilings: anomaly.relatedFilings,
      },
      generatedAt: new Date(),
    });
  }

  // 4. Baseline warning insights
  const warnings = await getBaselineWarnings();
  for (const w of warnings) {
    insights.push({
      id: generateId('insight'),
      type: 'baseline_warning',
      severity: w.level === 'critical' ? 'critical' : 'warning',
      title: w.rule,
      description: w.message,
      data: w.details,
      generatedAt: new Date(),
    });
  }

  return insights;
}
