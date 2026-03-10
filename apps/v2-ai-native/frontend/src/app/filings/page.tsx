'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, DOMAIN_LABELS, RISK_LABELS, RISK_COLORS, RISK_DOT_COLORS } from '@/lib/constants';

export default function FilingsPage() {
  const [filings, setFilings] = useState<unknown[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.getFilings(params).then((res) => {
      setFilings(res.data);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }, [filters]);

  function updateFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">备案列表 ({total})</h1>
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            <span className="rounded bg-white/20 px-1 py-0.5 text-[10px] font-bold leading-tight">AI</span>
            对话新建备案
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={filters.type ?? ''}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          >
            <option value="">全部类型</option>
            {Object.entries(FILING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={filters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={filters.domain ?? ''}
            onChange={(e) => updateFilter('domain', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          >
            <option value="">全部领域</option>
            {Object.entries(DOMAIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input
            type="text"
            placeholder="搜索关键词..."
            value={filters.keyword ?? ''}
            onChange={(e) => updateFilter('keyword', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-gray-400">加载中...</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">编号</th>
                  <th className="px-4 py-3 text-left font-medium">标题</th>
                  <th className="px-4 py-3 text-left font-medium">类型</th>
                  <th className="px-4 py-3 text-left font-medium">领域</th>
                  <th className="px-4 py-3 text-right font-medium">金额(万)</th>
                  <th className="px-4 py-3 text-left font-medium">风险</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">来源</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(filings as Array<Record<string, unknown>>).map((f) => {
                  const riskLevel = f.riskLevel as string | null;
                  return (
                    <tr key={f.id as string} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <Link href={`/filings/${f.id}`} className="text-indigo-600 hover:underline font-medium">
                          {f.filingNumber as string}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{f.title as string}</td>
                      <td className="px-4 py-3 text-gray-600">{FILING_TYPE_LABELS[f.type as string] ?? f.type}</td>
                      <td className="px-4 py-3 text-gray-600">{DOMAIN_LABELS[f.domain as string] ?? f.domain}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{Number(f.amount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {riskLevel ? (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${RISK_COLORS[riskLevel] ?? ''}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${RISK_DOT_COLORS[riskLevel] ?? 'bg-gray-400'}`} />
                            {RISK_LABELS[riskLevel] ?? riskLevel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[f.status as string] ?? ''}`}>
                          {STATUS_LABELS[f.status as string] ?? f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(f as Record<string, unknown>).aiSource ? (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                            <span className="inline-flex h-3 w-3 items-center justify-center rounded bg-indigo-600 text-[7px] font-bold text-white">AI</span>
                            对话创建
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">表单</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{new Date(f.createdAt as string).toLocaleDateString('zh-CN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filings.length === 0 && <div className="py-12 text-center text-gray-400">暂无数据</div>}
          </div>
        )}
      </main>
    </div>
  );
}
