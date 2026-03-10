import type { PeriodicReport } from '@filing/shared';
import { generateId } from '../lib/id.js';
import { getDashboardStats, getTrendAnalysis, getAnomalyDetection, getBaselineWarnings, generateInsights } from './analytics.js';

// ============================================================
// generateWeeklyReport — 周报
// ============================================================

export async function generateWeeklyReport(): Promise<PeriodicReport> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodLabel = `${weekStart.toISOString().slice(0, 10)} ~ ${now.toISOString().slice(0, 10)}`;

  const [stats, trend, anomalyResult, warnings, insights] = await Promise.all([
    getDashboardStats(),
    getTrendAnalysis('weekly'),
    getAnomalyDetection(),
    getBaselineWarnings(),
    generateInsights(),
  ]);

  // Build summary paragraph
  const summaryParts: string[] = [];

  summaryParts.push(
    `本周（${periodLabel}）投资备案系统总览：共有${stats.totalFilings}笔备案，总金额${stats.totalAmount}万元。`
  );

  if (trend.filingCount > 0) {
    const changeDir = trend.filingCountChange > 0 ? '增长' : trend.filingCountChange < 0 ? '下降' : '持平';
    summaryParts.push(
      `本周新增${trend.filingCount}笔备案，较上周${changeDir}${Math.abs(trend.filingCountChange)}%，金额变化${trend.amountChange}%。`
    );
  } else {
    summaryParts.push('本周无新增备案。');
  }

  if (stats.pendingCount > 0) {
    summaryParts.push(`当前有${stats.pendingCount}笔备案待审批。`);
  }

  if (anomalyResult.anomalies.length > 0) {
    const criticalCount = anomalyResult.anomalies.filter((a) => a.severity === 'critical').length;
    const warningCount = anomalyResult.anomalies.filter((a) => a.severity === 'warning').length;
    summaryParts.push(
      `异常检测发现${anomalyResult.anomalies.length}个问题（${criticalCount}个严重、${warningCount}个警告），请重点关注。`
    );
  } else {
    summaryParts.push('本周未发现异常。');
  }

  if (warnings.length > 0) {
    const criticalWarnings = warnings.filter((w) => w.level === 'critical');
    if (criticalWarnings.length > 0) {
      summaryParts.push(
        `底线预警：${criticalWarnings.map((w) => w.message).join('；')}。`
      );
    }
  }

  return {
    id: generateId('report'),
    type: 'weekly',
    period: periodLabel,
    summary: summaryParts.join('\n'),
    insights,
    stats,
    generatedAt: new Date(),
  };
}

// ============================================================
// generateMonthlyReport — 月报
// ============================================================

export async function generateMonthlyReport(): Promise<PeriodicReport> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  const [stats, trend, anomalyResult, warnings, insights] = await Promise.all([
    getDashboardStats(),
    getTrendAnalysis('monthly'),
    getAnomalyDetection(),
    getBaselineWarnings(),
    generateInsights(),
  ]);

  const summaryParts: string[] = [];

  summaryParts.push(
    `${periodLabel}投资备案月度报告：系统累计${stats.totalFilings}笔备案，总金额${stats.totalAmount}万元，平均审批时长${stats.avgApprovalHours}小时。`
  );

  if (trend.filingCount > 0) {
    const changeDir = trend.filingCountChange > 0 ? '增长' : trend.filingCountChange < 0 ? '下降' : '持平';
    summaryParts.push(
      `本月新增${trend.filingCount}笔备案，金额${trend.totalAmount}万元。较上月备案数${changeDir}${Math.abs(trend.filingCountChange)}%，金额变化${trend.amountChange}%。`
    );
  } else {
    summaryParts.push('本月暂无新增备案。');
  }

  // Domain breakdown
  if (trend.topDomains.length > 0) {
    const domainText = trend.topDomains
      .map((d) => `${d.domain}（${d.percentage}%，${d.amount}万元）`)
      .join('、');
    summaryParts.push(`领域分布：${domainText}。`);
  }

  // Type breakdown
  if (trend.topTypes.length > 0) {
    const typeText = trend.topTypes
      .map((t) => `${t.type}${t.count}笔`)
      .join('、');
    summaryParts.push(`备案类型：${typeText}。`);
  }

  if (stats.pendingCount > 0) {
    summaryParts.push(`当前待审批${stats.pendingCount}笔。`);
  }

  if (anomalyResult.anomalies.length > 0) {
    summaryParts.push(`\n【风险提示】本月发现${anomalyResult.anomalies.length}个异常：`);
    for (const a of anomalyResult.anomalies) {
      summaryParts.push(`- ${a.title}：${a.description}`);
    }
  }

  if (warnings.length > 0) {
    summaryParts.push(`\n【底线预警】共${warnings.length}条：`);
    for (const w of warnings) {
      summaryParts.push(`- [${w.level === 'critical' ? '严重' : '警告'}] ${w.message}`);
    }
  }

  return {
    id: generateId('report'),
    type: 'monthly',
    period: periodLabel,
    summary: summaryParts.join('\n'),
    insights,
    stats,
    generatedAt: new Date(),
  };
}
