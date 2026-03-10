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

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="mb-6 text-xl font-bold">首页看板</h1>

        {/* 概览卡片 */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card label="备案总数" value={String(stats.totalCount)} />
          <Card label="总金额" value={`${Number(stats.totalAmount).toLocaleString()}万`} />
          <Card label="审批中" value={String(byStatus.filter(s => s.status.startsWith('pending')).reduce((a, b) => a + b.cnt, 0))} color="text-orange-600" />
          <Card label="已完成" value={String(byStatus.find(s => s.status === 'completed')?.cnt ?? 0)} color="text-green-600" />
        </div>

        {/* 分布 */}
        <div className="grid gap-6 md:grid-cols-3">
          <Section title="按状态">
            {byStatus.map((s) => (
              <Row key={s.status} label={STATUS_LABELS[s.status] ?? s.status} value={s.cnt} />
            ))}
          </Section>
          <Section title="按类型">
            {byType.map((t) => (
              <Row key={t.type} label={FILING_TYPE_LABELS[t.type] ?? t.type} value={t.cnt} />
            ))}
          </Section>
          <Section title="按领域">
            {byDomain.map((d) => (
              <Row key={d.domain} label={DOMAIN_LABELS[d.domain] ?? d.domain} value={d.cnt} />
            ))}
          </Section>
        </div>
      </main>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-700">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
