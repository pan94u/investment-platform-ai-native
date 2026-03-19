'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, DOMAIN_LABELS } from '@/lib/constants';

export default function FilingsPage() {
  const [filings, setFilings] = useState<unknown[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v),
    );
    api
      .getFilings(params)
      .then((res) => {
        setFilings(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  function updateFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">备案列表</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              共 {total} 条备案记录
            </p>
          </div>
          <Link
            href="/filings/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建备案
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <select
            value={filters.type ?? ''}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="form-input form-select h-9 w-auto min-w-[120px] text-sm"
          >
            <option value="">全部类型</option>
            {Object.entries(FILING_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="form-input form-select h-9 w-auto min-w-[120px] text-sm"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filters.domain ?? ''}
            onChange={(e) => updateFilter('domain', e.target.value)}
            className="form-input form-select h-9 w-auto min-w-[120px] text-sm"
          >
            <option value="">全部领域</option>
            {Object.entries(DOMAIN_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索关键词..."
              value={filters.keyword ?? ''}
              onChange={(e) => updateFilter('keyword', e.target.value)}
              className="form-input h-9 w-48 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    编号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    标题
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    类型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    领域
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    金额(万)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(filings as Array<Record<string, unknown>>).map((f) => (
                  <tr
                    key={f.id as string}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/filings/${f.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {f.filingNumber as string}
                      </Link>
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3.5 font-medium text-slate-700">
                      {f.title as string}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {FILING_TYPE_LABELS[f.type as string] ?? f.type}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {DOMAIN_LABELS[f.domain as string] ?? f.domain}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">
                      {Number(f.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[f.status as string] ?? ''}`}
                      >
                        {STATUS_LABELS[f.status as string] ?? f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {new Date(f.createdAt as string).toLocaleDateString(
                        'zh-CN',
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filings.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">
                暂无数据
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
