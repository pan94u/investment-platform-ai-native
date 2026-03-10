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
          <Link href="/filings/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            新建备案
          </Link>
        </div>

        {/* 筛选栏 */}
        <div className="mb-4 flex flex-wrap gap-3">
          <select value={filters.type ?? ''} onChange={(e) => updateFilter('type', e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">全部类型</option>
            {Object.entries(FILING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filters.status ?? ''} onChange={(e) => updateFilter('status', e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filters.domain ?? ''} onChange={(e) => updateFilter('domain', e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">全部领域</option>
            {Object.entries(DOMAIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input
            type="text"
            placeholder="搜索关键词..."
            value={filters.keyword ?? ''}
            onChange={(e) => updateFilter('keyword', e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="py-12 text-center text-gray-400">加载中...</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">编号</th>
                  <th className="px-4 py-3 text-left font-medium">标题</th>
                  <th className="px-4 py-3 text-left font-medium">类型</th>
                  <th className="px-4 py-3 text-left font-medium">领域</th>
                  <th className="px-4 py-3 text-right font-medium">金额(万)</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(filings as Array<Record<string, unknown>>).map((f) => (
                  <tr key={f.id as string} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/filings/${f.id}`} className="text-blue-600 hover:underline">
                        {f.filingNumber as string}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{f.title as string}</td>
                    <td className="px-4 py-3">{FILING_TYPE_LABELS[f.type as string] ?? f.type}</td>
                    <td className="px-4 py-3">{DOMAIN_LABELS[f.domain as string] ?? f.domain}</td>
                    <td className="px-4 py-3 text-right">{Number(f.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[f.status as string] ?? ''}`}>
                        {STATUS_LABELS[f.status as string] ?? f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(f.createdAt as string).toLocaleDateString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filings.length === 0 && <div className="py-12 text-center text-gray-400">暂无数据</div>}
          </div>
        )}
      </main>
    </div>
  );
}
