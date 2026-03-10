'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, STATUS_LABELS, DOMAIN_LABELS } from '@/lib/constants';

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.getDashboardStats().then(setStats);
  }, []);

  if (!stats) return <div><Nav /><div className="p-8 text-center text-gray-400">加载中...</div></div>;

  const byStatus = stats.byStatus as Array<{ status: string; cnt: number }>;
  const byType = stats.byType as Array<{ type: string; cnt: number }>;
  const byDomain = stats.byDomain as Array<{ domain: string; cnt: number }>;
  const pendingCount = byStatus.filter((s) => s.status.startsWith('pending')).reduce((a, b) => a + b.cnt, 0);
  const completedCount = byStatus.find((s) => s.status === 'completed')?.cnt ?? 0;

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="mb-6 text-xl font-bold">仪表盘</h1>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card label="备案总数" value={String(stats.totalCount)} icon="total" />
          <Card label="总金额" value={`${Number(stats.totalAmount).toLocaleString()}万`} icon="amount" />
          <Card label="审批中" value={String(pendingCount)} icon="pending" color="text-orange-600" />
          <Card label="已完成" value={String(completedCount)} icon="done" color="text-green-600" />
        </div>

        {/* Distribution */}
        <div className="grid gap-6 md:grid-cols-3">
          <Section title="按状态">
            {byStatus.map((s) => (
              <Row key={s.status} label={STATUS_LABELS[s.status] ?? s.status} value={s.cnt} total={Number(stats.totalCount)} />
            ))}
          </Section>
          <Section title="按类型">
            {byType.map((t) => (
              <Row key={t.type} label={FILING_TYPE_LABELS[t.type] ?? t.type} value={t.cnt} total={Number(stats.totalCount)} />
            ))}
          </Section>
          <Section title="按领域">
            {byDomain.map((d) => (
              <Row key={d.domain} label={DOMAIN_LABELS[d.domain] ?? d.domain} value={d.cnt} total={Number(stats.totalCount)} />
            ))}
          </Section>
        </div>
      </main>
    </div>
  );
}

function Card({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  const iconPaths: Record<string, string> = {
    total: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    amount: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
    pending: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    done: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
          <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[icon] ?? iconPaths.total} />
          </svg>
        </div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`text-xl font-bold ${color ?? 'text-gray-900'}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-gray-600 uppercase tracking-wide">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-indigo-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
