'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, DOMAIN_LABELS } from '@/lib/constants';

export default function FilingsPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-[#FAFAF9]">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">备案列表</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              共 {total} 条备案记录
            </p>
          </div>
          <Link
            href="/filings/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0055AA] active:bg-[#004488]"
          >
            新建备案
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-5 flex items-center gap-2.5">
          <FilterSelect value={filters.type ?? ''} onChange={(v) => updateFilter('type', v)} placeholder="全部类型" options={FILING_TYPE_LABELS} />
          <FilterSelect value={filters.status ?? ''} onChange={(v) => updateFilter('status', v)} placeholder="全部状态" options={STATUS_LABELS} />
          <FilterSelect value={filters.domain ?? ''} onChange={(v) => updateFilter('domain', v)} placeholder="全部领域" options={DOMAIN_LABELS} />
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索关键词..."
              value={filters.keyword ?? ''}
              onChange={(e) => updateFilter('keyword', e.target.value)}
              style={{ width: '11rem' }}
              className="h-8 rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-700 transition focus:border-[#0066CC] focus:outline-none focus:ring-2 focus:ring-[#0066CC]/10"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-400">
                    编号
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-400">
                    标题
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-400">
                    类型
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-400">
                    领域
                  </th>
                  <th className="px-5 py-3 text-right text-sm font-medium text-gray-400">
                    金额(万)
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-400">
                    状态
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-400">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {(filings as Array<Record<string, unknown>>).map((f) => (
                  <tr
                    key={f.id as string}
                    onClick={() => router.push(`/filings/${f.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3 text-[#0066CC]">
                      {f.filingNumber as string}
                    </td>
                    <td className="max-w-[280px] truncate px-5 py-3 font-medium text-gray-700">
                      {f.title as string}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {FILING_TYPE_LABELS[f.type as string] ?? f.type}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {DOMAIN_LABELS[f.domain as string] ?? f.domain}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-gray-700">
                      {Number(f.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge ${STATUS_COLORS[f.status as string] ?? ''}`}
                      >
                        {STATUS_LABELS[f.status as string] ?? f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(f.createdAt as string).toLocaleDateString(
                        'zh-CN',
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filings.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-400">
                暂无数据
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: 'auto' }}
      className="h-8 min-w-[110px] appearance-none rounded-md border border-gray-200 bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2716%27%20height=%2716%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23A1A1AA%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat px-3 pr-8 text-sm text-gray-700 transition focus:border-[#0066CC] focus:outline-none focus:ring-2 focus:ring-[#0066CC]/10"
    >
      <option value="">{placeholder}</option>
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );
}
