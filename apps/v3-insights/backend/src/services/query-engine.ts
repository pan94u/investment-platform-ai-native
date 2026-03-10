import { eq, sql, count, desc, gte, and, ilike } from 'drizzle-orm';
import { filings } from '@filing/database';
import type { QueryResult } from '@filing/shared';
import { db } from '../lib/db.js';

// --- Label maps ---

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

const statusLabels: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  pending_level1: '待直属上级审批',
  pending_level2: '待集团审批',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
};

// ============================================================
// Query type detection
// ============================================================

type QueryType =
  | 'filing_count'
  | 'amount_sum'
  | 'trend'
  | 'anomaly'
  | 'project_history'
  | 'clawback'
  | 'domain_distribution'
  | 'general';

function detectQueryType(question: string): QueryType {
  if (/对赌|变更|调整/.test(question)) return 'clawback';
  if (/项目/.test(question) && /历史|记录|详情|情况/.test(question)) return 'project_history';
  if (/统计|多少|数量|笔|条/.test(question)) return 'filing_count';
  if (/金额|总额|总计|投资额/.test(question)) return 'amount_sum';
  if (/趋势|变化|对比|增长|下降/.test(question)) return 'trend';
  if (/风险|异常|预警|告警/.test(question)) return 'anomaly';
  if (/领域|分布|占比|集中/.test(question)) return 'domain_distribution';
  return 'general';
}

/** Extract project name from question */
function extractProjectName(question: string): string | null {
  // Match known project keywords
  const patterns = [
    /[「「](.+?)[」」]/,
    /项目[：:]?\s*(.+?)[\s，。？?]/,
    /(海川|星辰|瑞丰|康明|创新科技)(?:项目|基金)?/,
  ];
  for (const p of patterns) {
    const m = question.match(p);
    if (m) return m[1].replace(/项目|基金/, '') + (m[1].includes('基金') ? '基金' : '项目');
  }
  return null;
}

/** Extract domain filter from question */
function extractDomain(question: string): string | null {
  if (/智慧住居|住居/.test(question)) return 'smart_living';
  if (/产业金融|金融/.test(question)) return 'industrial_finance';
  if (/大健康|健康|医疗/.test(question)) return 'health';
  return null;
}

/** Extract type filter from question */
function extractType(question: string): string | null {
  if (/直投/.test(question)) return 'direct_investment';
  if (/对赌/.test(question)) return 'earnout_change';
  if (/退出/.test(question)) return 'fund_exit';
  if (/法人新设|新设/.test(question)) return 'legal_entity_setup';
  return null;
}

// ============================================================
// processQuery — 自然语言查询引擎
// ============================================================

export async function processQuery(question: string): Promise<QueryResult> {
  const queryType = detectQueryType(question);

  switch (queryType) {
    case 'filing_count':
      return handleFilingCount(question);
    case 'amount_sum':
      return handleAmountSum(question);
    case 'trend':
      return handleTrend(question);
    case 'anomaly':
      return handleAnomaly(question);
    case 'project_history':
      return handleProjectHistory(question);
    case 'clawback':
      return handleClawback(question);
    case 'domain_distribution':
      return handleDomainDistribution(question);
    default:
      return handleGeneral(question);
  }
}

// --- Handler implementations ---

async function handleFilingCount(question: string): Promise<QueryResult> {
  const domain = extractDomain(question);
  const type = extractType(question);

  const conditions = [];
  if (domain) conditions.push(eq(filings.domain, domain));
  if (type) conditions.push(eq(filings.type, type));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db.select({ cnt: count() }).from(filings).where(where);
  const cnt = result[0]?.cnt ?? 0;

  // Build descriptive answer
  const parts: string[] = [];
  if (domain) parts.push(domainLabels[domain] ?? domain);
  if (type) parts.push(typeLabels[type] ?? type);
  const scope = parts.length > 0 ? parts.join('、') + '的' : '';

  // Also get breakdown
  const breakdown = await db
    .select({ status: filings.status, cnt: count() })
    .from(filings)
    .where(where)
    .groupBy(filings.status);

  const breakdownText = breakdown
    .map((r) => `${statusLabels[r.status] ?? r.status}${r.cnt}笔`)
    .join('、');

  return {
    query: question,
    answer: `${scope}备案共${cnt}笔。按状态分布：${breakdownText}。`,
    data: breakdown.map((r) => ({
      status: r.status,
      statusLabel: statusLabels[r.status] ?? r.status,
      count: r.cnt,
    })),
    confidence: 0.9,
  };
}

async function handleAmountSum(question: string): Promise<QueryResult> {
  const domain = extractDomain(question);
  const type = extractType(question);

  const conditions = [];
  if (domain) conditions.push(eq(filings.domain, domain));
  if (type) conditions.push(eq(filings.type, type));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      total: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
      cnt: count(),
    })
    .from(filings)
    .where(where);

  const totalAmount = Number(result[0]?.total ?? '0');
  const cnt = result[0]?.cnt ?? 0;

  const parts: string[] = [];
  if (domain) parts.push(domainLabels[domain] ?? domain);
  if (type) parts.push(typeLabels[type] ?? type);
  const scope = parts.length > 0 ? parts.join('、') + '的' : '';

  // Amount by domain
  const byDomain = await db
    .select({
      domain: filings.domain,
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .where(where)
    .groupBy(filings.domain);

  const domainBreakdown = byDomain
    .map((r) => `${domainLabels[r.domain] ?? r.domain} ${Number(r.amt)}万元`)
    .join('、');

  return {
    query: question,
    answer: `${scope}备案总金额为${totalAmount}万元（共${cnt}笔）。按领域：${domainBreakdown}。`,
    data: byDomain.map((r) => ({
      domain: r.domain,
      domainLabel: domainLabels[r.domain] ?? r.domain,
      amount: Number(r.amt),
    })),
    confidence: 0.92,
  };
}

async function handleTrend(question: string): Promise<QueryResult> {
  // Monthly filing counts for last 6 months
  const monthlyRows = await db
    .select({
      month: sql<string>`to_char(${filings.createdAt}, 'YYYY-MM')`,
      cnt: count(),
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .where(gte(filings.createdAt, sql`NOW() - INTERVAL '6 months'`))
    .groupBy(sql`to_char(${filings.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${filings.createdAt}, 'YYYY-MM')`);

  if (monthlyRows.length === 0) {
    return {
      query: question,
      answer: '近6个月暂无备案数据。',
      data: [],
      confidence: 0.8,
    };
  }

  const trendText = monthlyRows
    .map((r) => `${r.month}：${r.cnt}笔（${Number(r.amt)}万元）`)
    .join('；');

  const first = monthlyRows[0];
  const last = monthlyRows[monthlyRows.length - 1];
  const trendDirection = last.cnt > first.cnt ? '上升' : last.cnt < first.cnt ? '下降' : '持平';

  return {
    query: question,
    answer: `近6个月备案趋势整体${trendDirection}。各月数据：${trendText}。`,
    data: monthlyRows.map((r) => ({
      month: r.month,
      count: r.cnt,
      amount: Number(r.amt),
    })),
    confidence: 0.85,
  };
}

async function handleAnomaly(question: string): Promise<QueryResult> {
  // Check for key anomalies
  const anomalies: Record<string, unknown>[] = [];

  // Clawback repeats
  const clawbackRows = await db
    .select({
      projectName: filings.projectName,
      cnt: count(),
    })
    .from(filings)
    .where(eq(filings.type, 'earnout_change'))
    .groupBy(filings.projectName)
    .having(sql`COUNT(*) > 1`);

  for (const r of clawbackRows) {
    anomalies.push({
      type: '重复对赌变更',
      project: r.projectName,
      count: r.cnt,
      severity: 'critical',
    });
  }

  // High amount filings
  const highAmount = await db
    .select({
      projectName: filings.projectName,
      title: filings.title,
      amount: filings.amount,
    })
    .from(filings)
    .where(sql`${filings.amount}::numeric > 50000`);

  for (const r of highAmount) {
    anomalies.push({
      type: '大额投资',
      project: r.projectName,
      title: r.title,
      amount: Number(r.amount),
      severity: 'critical',
    });
  }

  const answerParts = anomalies.map((a) => {
    if (a.type === '重复对赌变更') {
      return `${a.project}存在${a.count}次对赌变更（风险：重复下调）`;
    }
    return `${a.project}"${a.title}"金额${a.amount}万元（超大额阈值）`;
  });

  const answer = anomalies.length > 0
    ? `检测到${anomalies.length}个风险/异常：${answerParts.join('；')}。`
    : '当前未检测到显著风险或异常。';

  return {
    query: question,
    answer,
    data: anomalies,
    confidence: 0.88,
  };
}

async function handleProjectHistory(question: string): Promise<QueryResult> {
  const projectName = extractProjectName(question);
  if (!projectName) {
    return {
      query: question,
      answer: '未能识别项目名称，请指定具体项目（如：海川项目、星辰基金等）。',
      data: [],
      confidence: 0.3,
    };
  }

  const rows = await db
    .select()
    .from(filings)
    .where(ilike(filings.projectName, `%${projectName}%`))
    .orderBy(desc(filings.createdAt));

  if (rows.length === 0) {
    return {
      query: question,
      answer: `未找到"${projectName}"相关的备案记录。`,
      data: [],
      confidence: 0.7,
    };
  }

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);
  const historyText = rows
    .map((r) => `${r.filingNumber} ${r.title}（${statusLabels[r.status] ?? r.status}，${Number(r.amount)}万元）`)
    .join('；');

  return {
    query: question,
    answer: `"${rows[0].projectName}"共有${rows.length}笔备案记录，总涉及金额${totalAmount}万元。\n详情：${historyText}。`,
    data: rows.map((r) => ({
      id: r.id,
      filingNumber: r.filingNumber,
      title: r.title,
      type: r.type,
      typeLabel: typeLabels[r.type] ?? r.type,
      status: r.status,
      statusLabel: statusLabels[r.status] ?? r.status,
      amount: Number(r.amount),
      createdAt: r.createdAt,
    })),
    confidence: 0.95,
  };
}

async function handleClawback(question: string): Promise<QueryResult> {
  const projectName = extractProjectName(question);

  const conditions = [eq(filings.type, 'earnout_change')];
  if (projectName) conditions.push(ilike(filings.projectName, `%${projectName}%`));
  const where = and(...conditions);

  const rows = await db
    .select()
    .from(filings)
    .where(where)
    .orderBy(filings.createdAt);

  if (rows.length === 0) {
    const scope = projectName ? `"${projectName}"` : '';
    return {
      query: question,
      answer: `${scope}暂无对赌变更记录。`,
      data: [],
      confidence: 0.8,
    };
  }

  // Analyze the clawback trajectory
  const byProject: Record<string, typeof rows> = {};
  for (const r of rows) {
    if (!byProject[r.projectName]) byProject[r.projectName] = [];
    byProject[r.projectName].push(r);
  }

  const analysisTexts: string[] = [];
  const dataRecords: Record<string, unknown>[] = [];

  for (const [proj, projRows] of Object.entries(byProject)) {
    const first = projRows[0];
    const last = projRows[projRows.length - 1];
    const originalTarget = Number(first.originalTarget ?? 0);
    const latestTarget = Number(last.newTarget ?? 0);
    const declinePct = originalTarget > 0 ? Math.round(((originalTarget - latestTarget) / originalTarget) * 100) : 0;

    const trajectory = projRows
      .map((r) => `${Number(r.originalTarget)}万→${Number(r.newTarget)}万`)
      .join(' → ');

    analysisTexts.push(
      `${proj}：共${projRows.length}次对赌变更，轨迹为${trajectory}，累计下调${declinePct}%${declinePct > 50 ? '（超过50%底线）' : ''}。`
    );

    dataRecords.push({
      projectName: proj,
      changeCount: projRows.length,
      originalTarget,
      latestTarget,
      declinePercentage: declinePct,
      changes: projRows.map((r) => ({
        id: r.id,
        filingNumber: r.filingNumber,
        originalTarget: Number(r.originalTarget),
        newTarget: Number(r.newTarget),
        reason: r.changeReason,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  }

  return {
    query: question,
    answer: `对赌变更分析：\n${analysisTexts.join('\n')}`,
    data: dataRecords,
    confidence: 0.93,
  };
}

async function handleDomainDistribution(question: string): Promise<QueryResult> {
  const domainRows = await db
    .select({
      domain: filings.domain,
      cnt: count(),
      amt: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text`,
    })
    .from(filings)
    .groupBy(filings.domain)
    .orderBy(sql`SUM(${filings.amount}::numeric) DESC`);

  const totalAmt = domainRows.reduce((s, r) => s + Number(r.amt), 0);
  const totalCnt = domainRows.reduce((s, r) => s + r.cnt, 0);

  const distText = domainRows
    .map((r) => {
      const pct = totalAmt > 0 ? Math.round((Number(r.amt) / totalAmt) * 100) : 0;
      const label = domainLabels[r.domain] ?? r.domain;
      return `${label}：${r.cnt}笔、${Number(r.amt)}万元（占${pct}%）`;
    })
    .join('；');

  return {
    query: question,
    answer: `投资领域分布（共${totalCnt}笔，${totalAmt}万元）：${distText}。`,
    data: domainRows.map((r) => ({
      domain: r.domain,
      domainLabel: domainLabels[r.domain] ?? r.domain,
      count: r.cnt,
      amount: Number(r.amt),
      percentage: totalAmt > 0 ? Math.round((Number(r.amt) / totalAmt) * 100) : 0,
    })),
    confidence: 0.9,
  };
}

async function handleGeneral(question: string): Promise<QueryResult> {
  // Fallback: return overall summary
  const totalResult = await db.select({ cnt: count() }).from(filings);
  const amountResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text` })
    .from(filings);

  const cnt = totalResult[0]?.cnt ?? 0;
  const amt = Number(amountResult[0]?.total ?? '0');

  // Recent filings
  const recentFilings = await db
    .select()
    .from(filings)
    .orderBy(desc(filings.createdAt))
    .limit(5);

  const recentText = recentFilings
    .map((r) => `${r.filingNumber} ${r.title}（${statusLabels[r.status] ?? r.status}）`)
    .join('；');

  return {
    query: question,
    answer: `当前系统共有${cnt}笔备案，总金额${amt}万元。最近的备案包括：${recentText}。\n\n您可以尝试询问更具体的问题，例如："海川项目有多少笔备案"、"对赌变更情况如何"、"各领域投资分布"等。`,
    data: recentFilings.map((r) => ({
      id: r.id,
      filingNumber: r.filingNumber,
      title: r.title,
      status: r.status,
      amount: Number(r.amount),
    })),
    confidence: 0.5,
  };
}
