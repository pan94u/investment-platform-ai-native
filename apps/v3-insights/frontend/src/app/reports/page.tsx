'use client';

import { useState } from 'react';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';

/* ---------- types ---------- */

interface Report {
  period: string;
  summary: string;
  insights: string[];
  stats: Record<string, unknown>;
  generatedAt: string;
}

/* ---------- component ---------- */

export default function ReportsPage() {
  const [weeklyReport, setWeeklyReport] = useState<Report | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<Report | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  async function handleGenerateWeekly() {
    setLoadingWeekly(true);
    try {
      const report = await api.getWeeklyReport();
      setWeeklyReport(report);
    } catch {
      // Mock fallback
      setWeeklyReport({
        period: '2026年3月第2周（3月3日 - 3月9日）',
        summary: '本周投资备案整体运行平稳，共新增备案 3 笔，涉及金额 18,500 万元。审批流程正常推进，本周共完成审批 4 笔。智慧住居领域延续活跃态势，新增 2 笔直投投资备案。产业金融领域有 1 笔对赌变更进入集团审批阶段，金额 10,000 万元，需重点关注。\n\n审批效率方面，本周平均审批时长为 16.2 小时，较上周（18.8 小时）有所改善。上级审批环节耗时下降明显，但集团审批环节仍存在排队现象。',
        insights: [
          '本周备案数量（3笔）与上周持平，金额环比增长 12%',
          '智慧住居领域本周新增 2 笔备案，占本周总量的 67%',
          '海川项目对赌变更（三）已提交集团审批，建议跟进审批进度',
          '本周无新增异常检测告警，系统运行健康',
          '审批效率持续改善，建议关注集团审批环节的排队问题',
        ],
        stats: {
          newFilings: 3,
          completedApprovals: 4,
          totalAmount: 18500,
          avgApprovalHours: 16.2,
          pendingCount: 5,
        },
        generatedAt: '2026-03-10T10:00:00Z',
      });
    } finally {
      setLoadingWeekly(false);
    }
  }

  async function handleGenerateMonthly() {
    setLoadingMonthly(true);
    try {
      const report = await api.getMonthlyReport();
      setMonthlyReport(report);
    } catch {
      // Mock fallback
      setMonthlyReport({
        period: '2026年2月',
        summary: '2月份投资备案共 3 笔，总金额 24,000 万元，较1月份（6笔，45,000万元）均有下降，主要受春节假期影响。审批整体保持顺畅，全月完成审批 5 笔（含跨月备案），平均审批时长 19.3 小时。\n\n本月投资领域分布较为均衡：智慧住居 1 笔（8,000万元），产业金融 1 笔（10,000万元），大健康 1 笔（6,000万元）。值得关注的是，海川项目第三次对赌变更已在月末提交，该项目对赌变更频次已触发预警规则。\n\n合规方面，本月所有备案均通过基线合规检查，无违规事项。异常检测系统发现 2 项需关注事项：集团审批环节耗时增加、某直投项目数据不一致。',
        insights: [
          '备案数量季节性下降，符合历史春节月份规律（平均下降 40-50%）',
          '领域分布趋于均衡，智慧住居占比从 1 月的 55% 降至 33%',
          '海川项目对赌变更频次达到预警阈值，建议安排专项审查',
          '集团审批耗时环比增加 78%，与年度预算审核期重叠有关',
          '本月投资回报跟踪显示，2025年直投项目整体运营情况良好',
          '建议关注产业金融领域审批流程优化，平均耗时仍高于其他领域',
        ],
        stats: {
          totalFilings: 3,
          totalAmount: 24000,
          completedApprovals: 5,
          avgApprovalHours: 19.3,
          byDomain: { smart_living: 1, industrial_finance: 1, health: 1 },
          byType: { direct_investment: 1, earnout_change: 1, legal_entity_setup: 1 },
          baselinePassRate: '100%',
          anomalyCount: 2,
        },
        generatedAt: '2026-03-01T08:00:00Z',
      });
    } finally {
      setLoadingMonthly(false);
    }
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl p-6 space-y-8">
        <h1 className="text-xl font-bold text-gray-900">报告生成</h1>

        {/* Weekly Report Section */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">周报</h2>
                <p className="text-xs text-gray-500">AI 自动生成的每周投资备案分析报告</p>
              </div>
            </div>
            <button
              onClick={handleGenerateWeekly}
              disabled={loadingWeekly}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingWeekly ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  生成中...
                </span>
              ) : weeklyReport ? '重新生成' : '生成周报'}
            </button>
          </div>

          {weeklyReport ? (
            <ReportContent report={weeklyReport} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="mb-3 h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm">点击"生成周报"按钮生成本周报告</p>
            </div>
          )}
        </section>

        {/* Monthly Report Section */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
                <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">月报</h2>
                <p className="text-xs text-gray-500">AI 自动生成的每月投资备案综合分析报告</p>
              </div>
            </div>
            <button
              onClick={handleGenerateMonthly}
              disabled={loadingMonthly}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {loadingMonthly ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  生成中...
                </span>
              ) : monthlyReport ? '重新生成' : '生成月报'}
            </button>
          </div>

          {monthlyReport ? (
            <ReportContent report={monthlyReport} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="mb-3 h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
              <p className="text-sm">点击"生成月报"按钮生成上月报告</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ---------- sub-components ---------- */

function ReportContent({ report }: { report: Report }) {
  const statsEntries = Object.entries(report.stats).filter(([, v]) => typeof v !== 'object');
  const statLabels: Record<string, string> = {
    newFilings: '新增备案',
    totalFilings: '备案总数',
    completedApprovals: '完成审批',
    totalAmount: '总金额(万)',
    avgApprovalHours: '平均审批时长(h)',
    pendingCount: '待审批',
    baselinePassRate: '合规通过率',
    anomalyCount: '异常数',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Period & Generated At */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">{report.period}</h3>
        <span className="text-xs text-gray-400">
          生成于 {new Date(report.generatedAt).toLocaleString('zh-CN')}
        </span>
      </div>

      {/* Stats Table */}
      {statsEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statsEntries.map(([key, val]) => (
            <div key={key} className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
              <div className="text-xs text-gray-500">{statLabels[key] ?? key}</div>
              <div className="mt-1 text-lg font-bold text-gray-800">
                {typeof val === 'number' ? val.toLocaleString() : String(val)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div>
        <h4 className="mb-2 text-sm font-bold text-gray-700">摘要</h4>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {report.summary}
        </div>
      </div>

      {/* Key Insights */}
      <div>
        <h4 className="mb-2 text-sm font-bold text-gray-700">关键洞察</h4>
        <div className="space-y-2">
          {report.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-emerald-50/50 border border-emerald-100 px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700 leading-relaxed">{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
