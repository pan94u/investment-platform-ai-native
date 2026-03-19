'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { api, getCurrentUser } from '@/lib/api';
import { FILING_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, DOMAIN_LABELS, PROJECT_STAGE_LABELS, APPROVAL_GROUP_LABELS, STAGE_LABELS } from '@/lib/constants';

export default function FilingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [filing, setFiling] = useState<Record<string, unknown> | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getFiling(id), api.getApprovalHistory(id)])
      .then(([f, h]) => {
        setFiling(f);
        setApprovalHistory(h as Array<Record<string, unknown>>);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit() {
    await api.submitFiling(id);
    router.refresh();
    window.location.reload();
  }

  async function handleRecall() {
    if (!confirm('确认撤回此备案？撤回后可重新编辑提交。')) return;
    await api.recallFiling(id);
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
        </div>
      </div>
    );
  }

  if (!filing) {
    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <Nav />
        <div className="flex flex-col items-center py-32 text-gray-400">
          <p className="text-sm">备案不存在</p>
        </div>
      </div>
    );
  }

  const user = getCurrentUser();
  const canSubmit = filing.status === 'draft' && filing.creatorId === user?.id;
  const canRecall = (filing.status as string)?.startsWith('pending_') && filing.creatorId === user?.id;
  const creator = filing.creator as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-gray-900">
                {filing.title as string}
              </h1>
              <span
                className={`badge ${STATUS_COLORS[filing.status as string] ?? ''}`}
              >
                {STATUS_LABELS[filing.status as string] ?? filing.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              {filing.filingNumber as string}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {canSubmit && (
              <button
                onClick={handleSubmit}
                className="rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0055AA]"
              >
                提交审批
              </button>
            )}
            {canRecall && (
              <button
                onClick={handleRecall}
                className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-red-300 hover:text-red-600"
              >
                撤回
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <Section title="基本信息">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Info label="备案类型" value={FILING_TYPE_LABELS[filing.type as string] ?? ''} />
            <Info label="项目阶段" value={PROJECT_STAGE_LABELS[filing.projectStage as string] ?? ''} />
            <Info label="投资领域" value={DOMAIN_LABELS[filing.domain as string] ?? ''} />
            <Info label="项目名称" value={filing.projectName as string} />
            <Info label="产业" value={filing.industry as string} />
            <Info label="金额" value={`${Number(filing.amount).toLocaleString()} 万元`} highlight />
            {filing.legalEntityName ? <Info label="法人主体" value={filing.legalEntityName as string} /> : null}
            {filing.investmentRatio ? <Info label="投资比例" value={`${filing.investmentRatio}%`} /> : null}
            {filing.valuationAmount ? <Info label="估值金额" value={`${Number(filing.valuationAmount).toLocaleString()} 万元`} /> : null}
            {filing.originalTarget ? <Info label="原对赌目标" value={`${Number(filing.originalTarget).toLocaleString()} 万元`} /> : null}
            {filing.newTarget ? <Info label="新对赌目标" value={`${Number(filing.newTarget).toLocaleString()} 万元`} /> : null}
            {filing.changeReason ? <Info label="变更原因" value={filing.changeReason as string} span2 /> : null}
            {filing.description ? <Info label="备注" value={filing.description as string} span2 /> : null}
          </dl>
        </Section>

        {/* Creator */}
        <Section title="创建人">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
              {(creator?.name as string)?.[0]}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">
                {creator?.name as string}
                <span className="ml-2 font-normal text-gray-400">
                  {creator?.department as string}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                创建于 {new Date(filing.createdAt as string).toLocaleString('zh-CN')}
                {filing.submittedAt
                  ? ` · 提交于 ${new Date(filing.submittedAt as string).toLocaleString('zh-CN')}`
                  : null}
              </div>
            </div>
          </div>
        </Section>

        {/* Approval timeline */}
        {approvalHistory.length > 0 && (
          <Section title="审批记录">
            <div className="relative ml-0.5">
              {/* Vertical line */}
              <div className="absolute left-[3.5px] top-2 bottom-2 w-px bg-gray-200" />

              <div className="space-y-4">
                {approvalHistory.map((a) => {
                  const status = a.status as string;
                  const dotColor =
                    status === 'approved' || status === 'acknowledged'
                      ? 'bg-emerald-500'
                      : status === 'rejected'
                        ? 'bg-red-500'
                        : 'bg-amber-400';

                  const stageLabel = STAGE_LABELS[a.stage as string] ?? (a.stage as string);
                  const groupLabel = a.groupName ? ` · ${APPROVAL_GROUP_LABELS[a.groupName as string] ?? a.groupName}` : '';

                  return (
                    <div key={a.id as string} className="relative flex gap-3.5 pl-5">
                      <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${dotColor}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">
                            {a.approverName as string}
                          </span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
                            {stageLabel}{groupLabel}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              status === 'approved' ? 'text-emerald-600' :
                              status === 'acknowledged' ? 'text-blue-600' :
                              status === 'rejected' ? 'text-red-500' : 'text-amber-600'
                            }`}
                          >
                            {status === 'approved' ? '已同意' :
                             status === 'acknowledged' ? '已知悉' :
                             status === 'rejected' ? '已驳回' : '待审批'}
                          </span>
                        </div>
                        {a.comment ? (
                          <p className="mt-0.5 text-sm text-gray-500">
                            {a.comment as string}
                          </p>
                        ) : null}
                        {a.decidedAt ? (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {new Date(a.decidedAt as string).toLocaleString('zh-CN')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-4 p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

function Info({
  label,
  value,
  span2,
  highlight,
}: {
  label: string;
  value: string;
  span2?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <dt className="text-xs uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className={`mt-0.5 text-sm ${highlight ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
        {value || '-'}
      </dd>
    </div>
  );
}
