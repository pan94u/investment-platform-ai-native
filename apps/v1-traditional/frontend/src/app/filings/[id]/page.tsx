'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { FileUpload } from '@/components/file-upload';
import { RichTextDisplay } from '@/components/rich-text-editor';
import { EmailPreviewModal } from '@/components/email-preview-modal';
import { api, getCurrentUser } from '@/lib/api';
import { FILING_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, PROJECT_STAGE_LABELS, APPROVAL_GROUP_LABELS, STAGE_LABELS, PROJECT_CATEGORY_LABELS } from '@/lib/constants';

type PendingApproval = {
  approvalId: string;
  stage: string;
  level: number;
  groupName: string | null;
};

export default function FilingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [filing, setFiling] = useState<Record<string, unknown> | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [myPending, setMyPending] = useState<PendingApproval | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalProcessing, setApprovalProcessing] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [recipientNames, setRecipientNames] = useState<Map<string, string>>(new Map());
  const [chainPreview, setChainPreview] = useState<{
    business: Array<{ userId: string; name: string; level: number }>;
    group: Array<{ userId: string; name: string; groupName: string }>;
    confirmation: { userId: string; name: string };
  } | null>(null);

  const user = getCurrentUser();

  // 邮件收件人姓名：从审批链预览 + 搜索 API 解析
  useEffect(() => {
    if (!filing) return;
    const recipients = (filing.emailRecipients as string[]) ?? [];
    if (recipients.length === 0) return;
    // 逐个搜索（emp_code 精确匹配）
    Promise.all(recipients.map(code =>
      api.searchUsers(code).then(list => {
        const match = list.find(u => u.id === code || u.empCode === code);
        return match ? [code, match.name] as const : null;
      }).catch(() => null)
    )).then(results => {
      const map = new Map<string, string>();
      for (const r of results) {
        if (r) map.set(r[0], r[1]);
      }
      // 合并审批链预览的名称
      if (chainPreview) {
        for (const b of chainPreview.business) map.set(b.userId, b.name);
        for (const g of chainPreview.group) map.set(g.userId, g.name);
        map.set(chainPreview.confirmation.userId, chainPreview.confirmation.name);
      }
      setRecipientNames(map);
    });
  }, [filing, chainPreview]);

  function loadData() {
    setLoading(true);
    Promise.all([api.getFiling(id), api.getApprovalHistory(id)])
      .then(([f, h]) => {
        setFiling(f);
        setApprovalHistory(h as Array<Record<string, unknown>>);

        // 加载完整审批链预览
        if (f && f.status !== 'draft') {
          api.getApprovalChainPreview({
            domain: f.domain as string,
            filingType: f.type as string,
            amount: String(f.amount ?? '0'),
            approvalGroups: ((f.approvalGroups as string[]) ?? []).join(','),
          }).then(setChainPreview).catch(() => {});
        }

        // 查找当前用户在这个 filing 上的 pending 审批
        const history = h as Array<Record<string, unknown>>;
        const pending = history.find(
          (a) => a.status === 'pending' && a.approverId === user?.id
        );
        if (pending) {
          setMyPending({
            approvalId: pending.id as string,
            stage: pending.stage as string,
            level: pending.level as number,
            groupName: pending.groupName as string | null,
          });
        } else {
          setMyPending(null);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [id]);

  async function handleSubmit() {
    await api.submitFiling(id);
    window.location.reload();
  }

  async function handleRecall() {
    if (!confirm('确认撤回此备案？撤回后可重新编辑提交。')) return;
    await api.recallFiling(id);
    window.location.reload();
  }

  async function handleApprovalAction(action: 'approve' | 'reject' | 'acknowledge') {
    if (!myPending) return;

    // confirmation 阶段同意 → 弹邮件预览
    if (action === 'approve' && myPending.stage === 'confirmation') {
      setEmailPreviewOpen(true);
      return;
    }

    setApprovalProcessing(true);
    try {
      if (action === 'approve') {
        await api.approveApproval(myPending.approvalId, approvalComment);
      } else if (action === 'reject') {
        await api.rejectApproval(myPending.approvalId, approvalComment);
      } else {
        await api.acknowledgeApproval(myPending.approvalId, approvalComment);
      }
      setApprovalComment('');
      setMyPending(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setApprovalProcessing(false);
    }
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

  const canSubmit = filing.status === 'draft' && filing.creatorId === user?.id;
  const canRecall = (filing.status as string)?.startsWith('pending_') && filing.creatorId === user?.id;
  const creator = filing.creator as Record<string, unknown>;
  const description = (filing.description as string) ?? '';
  const isHtml = description.includes('<') && description.includes('>');

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
              {filing.projectCode ? ` · 项目编号: ${filing.projectCode}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {canSubmit && (
              <>
                <Link
                  href={`/filings/${id}/edit`}
                  className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-[#0066CC] hover:text-[#0066CC]"
                >
                  编辑
                </Link>
                <button
                  onClick={handleSubmit}
                  className="rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0055AA]"
                >
                  提交审批
                </button>
              </>
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

        {/* 审批操作区（当前用户有 pending 审批时显示） */}
        {myPending && (
          <div className="card mb-4 border-l-4 border-l-[#0066CC] p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0066CC] text-xs font-bold text-white">!</div>
              <h2 className="text-base font-semibold text-gray-800">待您审批</h2>
              <span className={`badge ml-1 ${
                myPending.stage === 'business' ? 'bg-blue-50 text-blue-600' :
                myPending.stage === 'group' ? 'bg-violet-50 text-violet-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                {STAGE_LABELS[myPending.stage] ?? myPending.stage}
                {myPending.groupName ? ` · ${APPROVAL_GROUP_LABELS[myPending.groupName] ?? myPending.groupName}` : ''}
                {myPending.stage === 'business' ? ` L${myPending.level}` : ''}
              </span>
            </div>

            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="审批意见（选填）"
              className="form-input min-h-[64px] resize-none text-sm"
              rows={2}
            />

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleApprovalAction('approve')}
                disabled={approvalProcessing}
                className="rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0055AA] disabled:opacity-50"
              >
                {myPending.stage === 'confirmation' ? '确认' : '同意'}
              </button>
              <button
                onClick={() => handleApprovalAction('reject')}
                disabled={approvalProcessing}
                className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                驳回
              </button>
              <button
                onClick={() => handleApprovalAction('acknowledge')}
                disabled={approvalProcessing}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                知悉
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <Section title="基本信息">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Info label="备案类型" value={FILING_TYPE_LABELS[filing.type as string] ?? ''} />
            <Info label="项目阶段" value={PROJECT_STAGE_LABELS[filing.projectStage as string] ?? ''} />
            <Info label="投资领域" value={(filing.domain as string) ?? ''} />
            <Info label="行业" value={filing.industry as string} />
            {filing.projectCategory ? <Info label="项目类型" value={PROJECT_CATEGORY_LABELS[filing.projectCategory as string] ?? (filing.projectCategory as string)} /> : null}
            <Info label="项目名称" value={filing.projectName as string} />
            {filing.projectCode ? <Info label="项目编号" value={filing.projectCode as string} /> : null}
            <Info label="金额" value={`${Number(filing.amount).toLocaleString()} 万元`} highlight />
            <Info label="备案发起人" value={(creator?.name as string) ?? '-'} />
            {filing.filingTime ? <Info label="备案时间" value={new Date(filing.filingTime as string).toLocaleString('zh-CN')} /> : null}
            {((filing.emailRecipients as string[]) ?? []).length > 0 && (
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wider text-gray-400">备案邮件业务收件人</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {((filing.emailRecipients as string[]) ?? []).map((uid: string) => (
                    <span key={uid} className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                      {recipientNames.get(uid) ?? uid}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </Section>

        {/* 备案具体事项 */}
        {description && (
          <Section title="备案具体事项">
            {isHtml ? (
              <RichTextDisplay html={description} />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{description}</p>
            )}
          </Section>
        )}

        {/* 备案文件 */}
        <Section title="备案文件">
          <FileUpload filingId={id} readonly={filing.status !== 'draft' || filing.creatorId !== user?.id} />
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

        {/* 审批链路（完整链 + 实际记录合并） */}
        {(chainPreview || approvalHistory.length > 0) && (
          <Section title="审批链路">
            <ApprovalTimeline
              chain={chainPreview}
              history={approvalHistory}
              creatorName={(creator?.name as string) ?? ''}
            />
          </Section>
        )}

        {/* Email preview modal */}
        {emailPreviewOpen && myPending && (
          <EmailPreviewModal
            filingId={id}
            approvalId={myPending.approvalId}
            comment={approvalComment}
            onClose={() => setEmailPreviewOpen(false)}
            onSuccess={() => {
              setEmailPreviewOpen(false);
              setApprovalComment('');
              setMyPending(null);
              loadData();
            }}
          />
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

/** 完整审批链路时间线：合并预览链 + 实际审批记录 */
function ApprovalTimeline({
  chain,
  history,
  creatorName,
}: {
  chain: {
    business: Array<{ userId: string; name: string; level: number }>;
    group: Array<{ userId: string; name: string; groupName: string }>;
    confirmation: { userId: string; name: string };
  } | null;
  history: Array<Record<string, unknown>>;
  creatorName: string;
}) {
  // 构建完整步骤列表
  type Step = {
    key: string;
    name: string;
    label: string;
    status: 'approved' | 'rejected' | 'acknowledged' | 'pending' | 'future';
    comment?: string;
    decidedAt?: string;
  };

  const historyMap = new Map<string, Record<string, unknown>>();
  for (const h of history) {
    // 用 stage+level+groupName 做 key 匹配
    const k = `${h.stage}-${h.level ?? 0}-${h.groupName ?? ''}`;
    historyMap.set(k, h);
    // 也按 approverId 匹配
    historyMap.set(`uid-${h.approverId}`, h);
  }

  function findHistory(stage: string, level: number, groupName: string, userId: string): Record<string, unknown> | undefined {
    return historyMap.get(`${stage}-${level}-${groupName}`) ?? historyMap.get(`uid-${userId}`);
  }

  const steps: Step[] = [];

  // 发起人
  steps.push({ key: 'creator', name: creatorName || '发起人', label: '发起人', status: 'approved' });

  if (chain) {
    // 业务审批链
    for (const b of chain.business) {
      const h = findHistory('business', b.level, '', b.userId);
      const status = h ? (h.status as Step['status']) : 'future';
      steps.push({
        key: `business-${b.level}`,
        name: b.name,
        label: `业务 L${b.level}`,
        status,
        comment: h?.comment as string | undefined,
        decidedAt: h?.decidedAt as string | undefined,
      });
    }

    // 集团审批组
    for (const g of chain.group) {
      const h = findHistory('group', 0, g.groupName, g.userId);
      const status = h ? (h.status as Step['status']) : 'future';
      steps.push({
        key: `group-${g.groupName}`,
        name: g.name,
        label: APPROVAL_GROUP_LABELS[g.groupName] ?? g.groupName,
        status,
        comment: h?.comment as string | undefined,
        decidedAt: h?.decidedAt as string | undefined,
      });
    }

    // 确认人
    const ch = findHistory('confirmation', 0, '', chain.confirmation.userId);
    steps.push({
      key: 'confirmation',
      name: chain.confirmation.name,
      label: '确认人',
      status: ch ? (ch.status as Step['status']) : 'future',
      comment: ch?.comment as string | undefined,
      decidedAt: ch?.decidedAt as string | undefined,
    });
  } else {
    // 无预览链，仅展示已有历史
    for (const h of history) {
      const stageLabel = STAGE_LABELS[h.stage as string] ?? (h.stage as string);
      const groupLabel = h.groupName ? ` · ${APPROVAL_GROUP_LABELS[h.groupName as string] ?? h.groupName}` : '';
      steps.push({
        key: h.id as string,
        name: h.approverName as string,
        label: `${stageLabel}${groupLabel}`,
        status: h.status as Step['status'],
        comment: h.comment as string | undefined,
        decidedAt: h.decidedAt as string | undefined,
      });
    }
  }

  const statusConfig = {
    approved: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: '已同意' },
    acknowledged: { dot: 'bg-blue-500', text: 'text-blue-600', label: '已知悉' },
    rejected: { dot: 'bg-red-500', text: 'text-red-500', label: '已驳回' },
    pending: { dot: 'bg-amber-400', text: 'text-amber-600', label: '待审批' },
    future: { dot: 'bg-gray-200', text: 'text-gray-300', label: '未到达' },
  };

  return (
    <div className="relative ml-0.5">
      <div className="absolute left-[3.5px] top-2 bottom-2 w-px bg-gray-200" />
      <div className="space-y-4">
        {steps.map((s) => {
          const cfg = statusConfig[s.status];
          return (
            <div key={s.key} className="relative flex gap-3.5 pl-5">
              <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${cfg.dot}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-medium ${s.status === 'future' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {s.name}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${s.status === 'future' ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-400'}`}>
                    {s.label}
                  </span>
                  <span className={`text-xs font-medium ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>
                {s.comment ? <p className="mt-0.5 text-sm text-gray-500">{s.comment}</p> : null}
                {s.decidedAt ? <p className="mt-0.5 text-xs text-gray-400">{new Date(s.decidedAt).toLocaleString('zh-CN')}</p> : null}
              </div>
            </div>
          );
        })}
        {/* 完成标记 */}
        <div className="relative flex gap-3.5 pl-5">
          <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${steps.every(s => s.status === 'approved' || s.status === 'acknowledged') ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          <span className={`text-sm font-medium ${steps.every(s => s.status === 'approved' || s.status === 'acknowledged') ? 'text-emerald-600' : 'text-gray-300'}`}>
            完成
          </span>
        </div>
      </div>
    </div>
  );
}
