'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { api, getCurrentUser } from '@/lib/api';
import { FILING_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, DOMAIN_LABELS } from '@/lib/constants';

export default function FilingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [filing, setFiling] = useState<Record<string, unknown> | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getFiling(id),
      api.getApprovalHistory(id),
    ]).then(([f, h]) => {
      setFiling(f);
      setApprovalHistory(h as Array<Record<string, unknown>>);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit() {
    await api.submitFiling(id);
    router.refresh();
    window.location.reload();
  }

  if (loading) return <div><Nav /><div className="p-8 text-center text-gray-400">加载中...</div></div>;
  if (!filing) return <div><Nav /><div className="p-8 text-center text-gray-400">备案不存在</div></div>;

  const user = getCurrentUser();
  const canSubmit = filing.status === 'draft' && filing.creatorId === user?.id;

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{filing.title as string}</h1>
            <p className="mt-1 text-sm text-gray-500">{filing.filingNumber as string}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[filing.status as string] ?? ''}`}>
            {STATUS_LABELS[filing.status as string] ?? filing.status}
          </span>
        </div>

        {/* 基本信息 */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-medium">基本信息</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Info label="备案类型" value={FILING_TYPE_LABELS[filing.type as string] ?? ''} />
            <Info label="投资领域" value={DOMAIN_LABELS[filing.domain as string] ?? ''} />
            <Info label="项目名称" value={filing.projectName as string} />
            <Info label="产业" value={filing.industry as string} />
            <Info label="金额" value={`${Number(filing.amount).toLocaleString()} 万元`} />
            {filing.legalEntityName ? <Info label="法人主体" value={filing.legalEntityName as string} /> : null}
            {filing.investmentRatio ? <Info label="投资比例" value={`${filing.investmentRatio}%`} /> : null}
            {filing.valuationAmount ? <Info label="估值金额" value={`${Number(filing.valuationAmount).toLocaleString()} 万元`} /> : null}
            {filing.originalTarget ? <Info label="原对赌目标" value={`${Number(filing.originalTarget).toLocaleString()} 万元`} /> : null}
            {filing.newTarget ? <Info label="新对赌目标" value={`${Number(filing.newTarget).toLocaleString()} 万元`} /> : null}
            {filing.changeReason ? <Info label="变更原因" value={filing.changeReason as string} span2 /> : null}
            {filing.description ? <Info label="备注" value={filing.description as string} span2 /> : null}
          </dl>
        </div>

        {/* 创建人 */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-medium">创建人</h2>
          <div className="text-sm text-gray-600">
            {(filing.creator as Record<string, unknown>)?.name as string} · {(filing.creator as Record<string, unknown>)?.department as string}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            创建于 {new Date(filing.createdAt as string).toLocaleString('zh-CN')}
            {filing.submittedAt ? ` · 提交于 ${new Date(filing.submittedAt as string).toLocaleString('zh-CN')}` : null}
          </div>
        </div>

        {/* 审批历史 */}
        {approvalHistory.length > 0 && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-medium">审批记录</h2>
            <div className="space-y-3">
              {approvalHistory.map((a) => (
                <div key={a.id as string} className="flex items-start gap-3 text-sm">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${a.status === 'approved' ? 'bg-green-500' : a.status === 'rejected' ? 'bg-red-500' : 'bg-orange-400'}`} />
                  <div>
                    <span className="font-medium">{a.approverName as string}</span>
                    <span className="text-gray-400"> · {a.level === 1 ? '直属上级' : '集团审批'}</span>
                    <span className={`ml-2 ${a.status === 'approved' ? 'text-green-600' : a.status === 'rejected' ? 'text-red-600' : 'text-orange-600'}`}>
                      {a.status === 'approved' ? '已同意' : a.status === 'rejected' ? '已驳回' : '待审批'}
                    </span>
                    {a.comment ? <div className="mt-1 text-gray-500">{a.comment as string}</div> : null}
                    {a.decidedAt ? <div className="mt-0.5 text-xs text-gray-400">{new Date(a.decidedAt as string).toLocaleString('zh-CN')}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作 */}
        {canSubmit && (
          <button onClick={handleSubmit} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">
            提交审批
          </button>
        )}
      </main>
    </div>
  );
}

function Info({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <dt className="text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
