'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import {
  FILING_TYPE_LABELS,
  DOMAIN_LABELS,
  SEVERITY_COLORS,
  SEVERITY_DOT_COLORS,
  SEVERITY_LABELS,
  INSIGHT_TYPE_LABELS,
} from '@/lib/constants';

/* ---------- types ---------- */

interface DashboardData {
  overview: { totalFilings: number; totalAmount: number; pendingApprovals: number; avgApprovalHours: number };
  byType: Array<{ type: string; count: number; amount: number }>;
  byDomain: Array<{ domain: string; count: number; amount: number }>;
  byMonth: Array<{ month: string; count: number; amount: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

interface InsightItem {
  id: string;
  type: 'trend' | 'anomaly' | 'warning' | 'recommendation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

interface WarningItem {
  id: string;
  rule: string;
  severity: 'warning' | 'critical';
  message: string;
  details: string;
  filingIds: string[];
  createdAt: string;
}

interface AnomalyItem {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  relatedFilings: string[];
  detectedAt: string;
}

/* ---------- icons (SVG paths) ---------- */

const ICON_PATHS = {
  filings: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  amount: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  pending: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  speed: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  sparkle: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z',
  alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  radar: 'M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  trend: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  warning: 'M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  anomaly: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
  recommendation: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
};

const INSIGHT_TYPE_ICONS: Record<string, string> = {
  trend: ICON_PATHS.trend,
  anomaly: ICON_PATHS.anomaly,
  warning: ICON_PATHS.warning,
  recommendation: ICON_PATHS.recommendation,
};

/* ---------- component ---------- */

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [dashData, insightData, warningData, anomalyData] = await Promise.allSettled([
          api.getDashboard(),
          api.getInsights(),
          api.getWarnings(),
          api.getAnomalies(),
        ]);

        if (dashData.status === 'fulfilled') {
          setDashboard(dashData.value);
        } else {
          // Fallback mock data if API not ready
          setDashboard({
            overview: { totalFilings: 24, totalAmount: 185000, pendingApprovals: 5, avgApprovalHours: 18.5 },
            byType: [
              { type: 'direct_investment', count: 10, amount: 95000 },
              { type: 'earnout_change', count: 6, amount: 32000 },
              { type: 'fund_exit', count: 4, amount: 38000 },
              { type: 'legal_entity_setup', count: 3, amount: 15000 },
              { type: 'other_change', count: 1, amount: 5000 },
            ],
            byDomain: [
              { domain: 'smart_living', count: 11, amount: 82000 },
              { domain: 'industrial_finance', count: 8, amount: 68000 },
              { domain: 'health', count: 5, amount: 35000 },
            ],
            byMonth: [
              { month: '2025-10', count: 3, amount: 22000 },
              { month: '2025-11', count: 5, amount: 38000 },
              { month: '2025-12', count: 4, amount: 31000 },
              { month: '2026-01', count: 6, amount: 45000 },
              { month: '2026-02', count: 3, amount: 24000 },
              { month: '2026-03', count: 3, amount: 25000 },
            ],
            byStatus: [
              { status: 'draft', count: 2 },
              { status: 'pending_level1', count: 3 },
              { status: 'pending_level2', count: 2 },
              { status: 'approved', count: 8 },
              { status: 'completed', count: 9 },
            ],
          });
        }

        if (insightData.status === 'fulfilled') {
          setInsights(insightData.value);
        } else {
          setInsights([
            { id: '1', type: 'trend', severity: 'info', title: '本月备案数量环比上升 25%', description: '2026年3月备案量较2月上升，主要集中在直投投资和对赌变更类型。智慧住居领域增长最为明显。', createdAt: '2026-03-10' },
            { id: '2', type: 'warning', severity: 'warning', title: '海川项目对赌变更频次异常', description: '海川项目近6个月内已发生3次对赌变更，超过常规频率(年均1.2次)。建议关注项目运营情况。', createdAt: '2026-03-09' },
            { id: '3', type: 'anomaly', severity: 'critical', title: '大额备案集中审批风险', description: '当前有3笔金额超过1亿元的备案同时处于审批阶段，可能造成审批资源紧张和审批质量下降。', createdAt: '2026-03-08' },
            { id: '4', type: 'recommendation', severity: 'info', title: '建议优化产业金融领域审批流程', description: '产业金融领域平均审批时长(26.3小时)显著高于其他领域(15.2小时)，建议评估审批流程是否需要优化。', createdAt: '2026-03-07' },
          ]);
        }

        if (warningData.status === 'fulfilled') {
          setWarnings(warningData.value);
        } else {
          setWarnings([
            { id: 'w1', rule: '单笔金额上限', severity: 'critical', message: '某备案金额达到 2.5 亿元，超过单笔投资 2 亿元预警线', details: '根据集团投资管理规定，单笔投资超过2亿元需报集团投资决策委员会专项审议。', filingIds: ['f-001'], createdAt: '2026-03-10' },
            { id: 'w2', rule: '同项目变更频次', severity: 'warning', message: '海川项目 6 个月内对赌变更 3 次，触发频次预警', details: '同一项目半年内对赌变更超过2次，可能存在项目运营异常或初始投资条件设定不合理。', filingIds: ['f-002', 'f-003', 'f-004'], createdAt: '2026-03-09' },
            { id: 'w3', rule: '领域集中度', severity: 'warning', message: '智慧住居领域本季度投资占比达 55%，超过 50% 集中度阈值', details: '投资领域过度集中可能增加系统性风险，建议适度分散投资方向。', filingIds: [], createdAt: '2026-03-08' },
          ]);
        }

        if (anomalyData.status === 'fulfilled') {
          setAnomalies(anomalyData.value);
        } else {
          setAnomalies([
            { id: 'a1', type: '金额偏差', severity: 'warning', title: '估值金额与行业均值偏差较大', description: '某法人新设项目估值 8000 万元，而同行业同阶段项目平均估值为 3200 万元，偏差达 150%。', relatedFilings: ['f-005'], detectedAt: '2026-03-10' },
            { id: 'a2', type: '审批延迟', severity: 'info', title: '集团审批环节平均耗时增加', description: '近30天集团审批平均耗时从 8.2 小时增至 14.6 小时，增幅 78%。可能与年度预算审核期重叠有关。', relatedFilings: [], detectedAt: '2026-03-09' },
            { id: 'a3', type: '数据异常', severity: 'critical', title: '投资比例数据不一致', description: '某直投项目备案显示投资比例 35%，但关联法人主体持股比例记录为 42%，数据不一致。', relatedFilings: ['f-006'], detectedAt: '2026-03-08' },
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div>
        <Nav />
        <div className="flex h-96 items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            加载数据中...
          </div>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div>
        <Nav />
        <div className="flex h-96 items-center justify-center text-red-500">
          加载失败: {error}
        </div>
      </div>
    );
  }

  const ov = dashboard!.overview;

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">数据看板</h1>
          <span className="text-sm text-gray-400">数据更新于 {new Date().toLocaleDateString('zh-CN')}</span>
        </div>

        {/* Row 1: Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="总备案数"
            value={String(ov.totalFilings)}
            iconPath={ICON_PATHS.filings}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            label="总金额"
            value={`${(ov.totalAmount / 10000).toFixed(1)} 亿`}
            subtitle={`${ov.totalAmount.toLocaleString()} 万元`}
            iconPath={ICON_PATHS.amount}
            bgColor="bg-teal-50"
            iconColor="text-teal-600"
          />
          <StatCard
            label="待审批"
            value={String(ov.pendingApprovals)}
            iconPath={ICON_PATHS.pending}
            bgColor="bg-amber-50"
            iconColor="text-amber-600"
            valueColor="text-amber-600"
          />
          <StatCard
            label="平均审批时长"
            value={`${ov.avgApprovalHours}h`}
            iconPath={ICON_PATHS.speed}
            bgColor="bg-sky-50"
            iconColor="text-sky-600"
          />
        </div>

        {/* Row 2: AI Insights */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS.sparkle} />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">AI 洞察</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{insights.length} 条</span>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4 transition hover:bg-gray-50">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  insight.severity === 'critical' ? 'bg-red-100' : insight.severity === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  <svg className={`h-4 w-4 ${
                    insight.severity === 'critical' ? 'text-red-600' : insight.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={INSIGHT_TYPE_ICONS[insight.type] ?? ICON_PATHS.sparkle} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[insight.severity]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT_COLORS[insight.severity]}`} />
                      {SEVERITY_LABELS[insight.severity]}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {INSIGHT_TYPE_LABELS[insight.type] ?? insight.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-800">{insight.title}</h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Baseline Warnings */}
        {warnings.length > 0 && (
          <div className="rounded-xl border border-red-100 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS.alert} />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900">底线预警</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{warnings.length} 条</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {warnings.map((w) => (
                <div key={w.id} className={`rounded-lg border p-4 ${w.severity === 'critical' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[w.severity]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT_COLORS[w.severity]}`} />
                      {SEVERITY_LABELS[w.severity]}
                    </span>
                    <span className="text-xs font-medium text-gray-600">{w.rule}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{w.message}</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{w.details}</p>
                  {w.filingIds.length > 0 && (
                    <div className="mt-2 text-[10px] text-gray-400">
                      关联备案: {w.filingIds.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 4: Charts - Filing Trend, Type Distribution, Domain Distribution */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Monthly Trend */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-700">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS.trend} />
              </svg>
              月度趋势
            </h3>
            <div className="space-y-3">
              {dashboard!.byMonth.map((m) => {
                const maxCount = Math.max(...dashboard!.byMonth.map((x) => x.count), 1);
                const pct = Math.round((m.count / maxCount) * 100);
                return (
                  <div key={m.month}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">{m.month}</span>
                      <span className="font-medium text-gray-700">{m.count} 笔 / {(m.amount / 10000).toFixed(1)}亿</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Type Distribution */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-gray-700">类型分布</h3>
            <div className="space-y-3">
              {dashboard!.byType.map((t) => {
                const maxCount = Math.max(...dashboard!.byType.map((x) => x.count), 1);
                const pct = Math.round((t.count / maxCount) * 100);
                const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-green-500'];
                const idx = dashboard!.byType.indexOf(t);
                return (
                  <div key={t.type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">{FILING_TYPE_LABELS[t.type] ?? t.type}</span>
                      <span className="font-medium text-gray-700">{t.count} 笔</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${colors[idx % colors.length]} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Domain Distribution */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-gray-700">领域分布</h3>
            <div className="space-y-4">
              {dashboard!.byDomain.map((d) => {
                const totalCount = dashboard!.byDomain.reduce((sum, x) => sum + x.count, 0);
                const pct = totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0;
                const totalAmount = dashboard!.byDomain.reduce((sum, x) => sum + x.amount, 0);
                const amtPct = totalAmount > 0 ? Math.round((d.amount / totalAmount) * 100) : 0;
                return (
                  <div key={d.domain}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-gray-700">{DOMAIN_LABELS[d.domain] ?? d.domain}</span>
                      <span className="text-gray-500">{d.count} 笔 · {(d.amount / 10000).toFixed(1)}亿</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[10px] text-gray-400">数量</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-[10px] text-gray-400 text-right">{pct}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[10px] text-gray-400">金额</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-teal-400 transition-all duration-500" style={{ width: `${amtPct}%` }} />
                        </div>
                        <span className="w-8 text-[10px] text-gray-400 text-right">{amtPct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 5: Anomaly Detection */}
        {anomalies.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS.radar} />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900">异常检测</h2>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{anomalies.length} 条</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {anomalies.map((a) => (
                <div key={a.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 transition hover:shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[a.severity]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT_COLORS[a.severity]}`} />
                      {SEVERITY_LABELS[a.severity]}
                    </span>
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">{a.type}</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-800">{a.title}</h4>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{a.description}</p>
                  {a.relatedFilings.length > 0 && (
                    <div className="mt-2 text-[10px] text-gray-400">
                      关联: {a.relatedFilings.join(', ')}
                    </div>
                  )}
                  <div className="mt-2 text-[10px] text-gray-300">
                    {new Date(a.detectedAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- sub-components ---------- */

function StatCard({
  label,
  value,
  subtitle,
  iconPath,
  bgColor,
  iconColor,
  valueColor,
}: {
  label: string;
  value: string;
  subtitle?: string;
  iconPath: string;
  bgColor: string;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgColor}`}>
          <svg className={`h-5 w-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
        </div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`text-xl font-bold ${valueColor ?? 'text-gray-900'}`}>{value}</div>
          {subtitle && <div className="text-[10px] text-gray-400">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
