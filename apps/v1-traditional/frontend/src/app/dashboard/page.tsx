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

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      </div>
    );
  }

  const byStatus = stats.byStatus as Array<{ status: string; cnt: number }>;
  const byType = stats.byType as Array<{ type: string; cnt: number }>;
  const byDomain = stats.byDomain as Array<{ domain: string; cnt: number }>;

  const pendingCount = byStatus
    .filter((s) => s.status.startsWith('pending'))
    .reduce((a, b) => a + b.cnt, 0);
  const completedCount =
    byStatus.find((s) => s.status === 'completed')?.cnt ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* ── Overview Stats ─────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatCard
            icon={<IconFile />}
            label="备案总数"
            value={String(stats.totalCount)}
            accent="blue"
          />
          <StatCard
            icon={<IconAmount />}
            label="总投资金额"
            value={`${Number(stats.totalAmount).toLocaleString()}万`}
            accent="violet"
          />
          <StatCard
            icon={<IconClock />}
            label="审批中"
            value={String(pendingCount)}
            accent="amber"
          />
          <StatCard
            icon={<IconCheck />}
            label="已完成"
            value={String(completedCount)}
            accent="emerald"
          />
        </div>

        {/* ── Distribution ───────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <DistributionCard
            title="按状态分布"
            accent="blue"
            items={byStatus.map((s) => ({
              label: STATUS_LABELS[s.status] ?? s.status,
              value: s.cnt,
            }))}
          />
          <DistributionCard
            title="按类型分布"
            accent="violet"
            items={byType.map((t) => ({
              label: FILING_TYPE_LABELS[t.type] ?? t.type,
              value: t.cnt,
            }))}
          />
          <DistributionCard
            title="按领域分布"
            accent="emerald"
            items={byDomain.map((d) => ({
              label: DOMAIN_LABELS[d.domain] ?? d.domain,
              value: d.cnt,
            }))}
          />
        </div>
      </main>
    </div>
  );
}

/* ── Color map ───────────────────────────────────── */
const ACCENT = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    bar: 'bg-blue-500',    dot: 'bg-blue-600' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  bar: 'bg-violet-500',  dot: 'bg-violet-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   bar: 'bg-amber-500',   dot: 'bg-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', dot: 'bg-emerald-600' },
} as const;

type Accent = keyof typeof ACCENT;

/* ── Stat Card ───────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: Accent;
}) {
  const c = ACCENT[accent];
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${c.bg} ${c.text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-slate-400">{label}</div>
        <div className={`mt-0.5 truncate text-2xl font-bold leading-tight tracking-tight ${accent === 'blue' || accent === 'violet' ? 'text-slate-800' : c.text}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* ── Distribution Card ───────────────────────────── */
function DistributionCard({
  title,
  accent,
  items,
}: {
  title: string;
  accent: Accent;
  items: Array<{ label: string; value: number }>;
}) {
  const c = ACCENT[accent];
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, i) => sum + i.value, 0);

  return (
    <div className="card flex flex-col p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-3.5 w-1 rounded-full ${c.dot}`} />
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        <span className="text-xs tabular-nums text-slate-400">共 {total} 项</span>
      </div>

      {/* Bars */}
      <div className="flex-1 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] text-slate-500">{item.label}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-700">
                {item.value}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${c.bar} transition-all duration-500 ease-out`}
                style={{ width: `${(item.value / maxVal) * 100}%`, opacity: 0.75 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────── */
function IconFile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconAmount() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
