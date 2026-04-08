'use client';

/**
 * 移动端单条待办处理页（飞书机器人通知 deep link 直达）
 *
 * 设计要点：
 * - 无 Nav，飞书 webview 内嵌友好
 * - 大按钮、固定底部操作栏
 * - 支持已处理状态展示（不限制 status=pending）
 * - 「查看完整信息」折叠详情，避免跳转
 * - 不支持「reassign / 邮件预览」等桌面专属能力
 */

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  FILING_TYPE_LABELS,
  STAGE_LABELS,
  APPROVAL_GROUP_LABELS,
  PROJECT_STAGE_LABELS,
} from '@/lib/constants';
import { RichTextDisplay } from '@/components/rich-text-editor';

interface TodoDetail {
  approvalId: string;
  filingId: string;
  filingNumber: string;
  filingTitle: string;
  filingType: string;
  creatorName: string;
  domain: string;
  amount: string;
  stage: string;
  level: number;
  groupName: string | null;
  submittedAt: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected' | 'acknowledged';
  comment: string | null;
  decidedAt: string | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  approved: { label: '已同意', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: '已驳回', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  acknowledged: { label: '已知悉', color: 'bg-sky-50 text-sky-700 border-sky-200' },
};

export default function TodoDetailPage({ params }: { params: Promise<{ approvalId: string }> }) {
  const { approvalId } = use(params);

  const [todo, setTodo] = useState<TodoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [filingDetail, setFilingDetail] = useState<Record<string, unknown> | null>(null);

  const refetch = () => {
    setLoading(true);
    setError(null);
    api
      .getApprovalTodo(approvalId)
      .then((data) => setTodo(data as unknown as TodoDetail))
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(refetch, [approvalId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAction(action: 'approve' | 'reject' | 'acknowledge') {
    if (!todo) return;
    if (action === 'reject' && !comment.trim()) {
      alert('驳回需填写意见');
      return;
    }
    setProcessing(true);
    try {
      if (action === 'approve') await api.approveApproval(todo.approvalId, comment);
      else if (action === 'reject') await api.rejectApproval(todo.approvalId, comment);
      else await api.acknowledgeApproval(todo.approvalId, comment);
      setComment('');
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setProcessing(false);
    }
  }

  async function toggleDetail() {
    if (!showDetail && !filingDetail && todo) {
      try {
        const detail = await api.getFiling(todo.filingId);
        setFilingDetail(detail);
      } catch { /* ignore */ }
    }
    setShowDetail((v) => !v);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  if (error || !todo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <p className="text-sm text-gray-500">{error ?? '待办不存在'}</p>
        <Link href="/todos" className="mt-4 text-sm text-[#0066CC]">
          返回待办列表
        </Link>
      </div>
    );
  }

  const statusInfo = todo.status !== 'pending' ? STATUS_LABEL[todo.status] : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* 顶部标题区 */}
      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="flex-1 text-base font-medium leading-snug text-gray-800">{todo.filingTitle}</h1>
          <span
            className={`badge shrink-0 ${
              todo.stage === 'business'
                ? 'bg-blue-50 text-blue-600'
                : todo.stage === 'group'
                  ? 'bg-violet-50 text-violet-600'
                  : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {STAGE_LABELS[todo.stage] ?? todo.stage}
            {todo.groupName ? ` · ${APPROVAL_GROUP_LABELS[todo.groupName] ?? todo.groupName}` : ''}
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-400">{todo.filingNumber}</div>
      </header>

      {/* 已处理提示条 */}
      {statusInfo && (
        <div className={`border-b px-4 py-3 ${statusInfo.color}`}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-sm font-medium">{statusInfo.label}</span>
            {todo.decidedAt && (
              <span className="ml-auto text-xs opacity-75">
                {new Date(todo.decidedAt).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
          {todo.comment && <p className="mt-2 pl-6 text-xs leading-relaxed">{todo.comment}</p>}
        </div>
      )}

      {/* 核心信息块 */}
      <section className="mt-3 space-y-2 bg-white px-4 py-4">
        <Row label="备案类型" value={FILING_TYPE_LABELS[todo.filingType] ?? todo.filingType} />
        <Row label="金额" value={`${Number(todo.amount).toLocaleString()} 万元`} valueClass="text-gray-800 font-medium" />
        <Row label="发起人" value={todo.creatorName} />
        <Row label="提交时间" value={new Date(todo.submittedAt).toLocaleString('zh-CN')} />
        <Row label="审批人" value={todo.approverName} />
      </section>

      {/* 折叠 — 完整信息 */}
      <section className="mt-3 bg-white">
        <button
          type="button"
          onClick={toggleDetail}
          className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-700"
        >
          <span>查看完整备案信息</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${showDetail ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showDetail && filingDetail && <FilingDetail filing={filingDetail} />}
      </section>

      {/* 待处理：意见输入 + 底部固定按钮 */}
      {todo.status === 'pending' && (
        <>
          <section className="mt-3 bg-white px-4 py-4">
            <label className="mb-2 block text-xs text-gray-500">审批意见（驳回必填）</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入审批意见..."
              className="form-input min-h-[88px] resize-none text-sm"
              rows={3}
            />
          </section>

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleAction('reject')}
                disabled={processing}
                className="rounded-md border border-rose-200 py-3 text-sm font-medium text-rose-600 transition active:bg-rose-50 disabled:opacity-50"
              >
                驳回
              </button>
              <button
                type="button"
                onClick={() => handleAction('acknowledge')}
                disabled={processing}
                className="rounded-md border border-gray-200 py-3 text-sm font-medium text-gray-600 transition active:bg-gray-50 disabled:opacity-50"
              >
                知悉
              </button>
              <button
                type="button"
                onClick={() => handleAction('approve')}
                disabled={processing}
                className="rounded-md bg-[#0066CC] py-3 text-sm font-medium text-white transition active:bg-[#0055AA] disabled:opacity-50"
              >
                同意
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, valueClass = 'text-gray-700' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

/** 移动端结构化备案详情（替代 JSON 原文展示）
 *
 * 字段参考桌面端 /filings/[id]，按业务分组：
 *   - 项目信息（类型 / 阶段 / 领域 / 项目名 / 编号 / 产业 / 金额）
 *   - 投资细节（法人 / 比例 / 估值 / 对赌目标 / 变更原因）
 *   - 备案具体事项（HTML 富文本或纯文本）
 *   - 备案邮件业务收件人
 */
function FilingDetail({ filing }: { filing: Record<string, unknown> }) {
  // 顶部统一 cast — 避免 JSX 中 unknown 类型陷阱（CLAUDE.md 已记录）
  const f = {
    type: (filing.type as string) ?? '',
    projectStage: (filing.projectStage as string) ?? '',
    domain: (filing.domain as string) ?? '',
    projectName: (filing.projectName as string) ?? '',
    projectCode: (filing.projectCode as string) ?? '',
    industry: (filing.industry as string) ?? '',
    amount: filing.amount as number | string,
    legalEntityName: (filing.legalEntityName as string) ?? '',
    investmentRatio: (filing.investmentRatio as number | string | null) ?? '',
    valuationAmount: (filing.valuationAmount as number | string | null) ?? '',
    originalTarget: (filing.originalTarget as number | string | null) ?? '',
    newTarget: (filing.newTarget as number | string | null) ?? '',
    changeReason: (filing.changeReason as string) ?? '',
    filingTime: (filing.filingTime as string) ?? '',
    description: (filing.description as string) ?? '',
    emailRecipients: (filing.emailRecipients as string[]) ?? [],
  };
  const isHtml = f.description.includes('<') && f.description.includes('>');
  const recipients = f.emailRecipients.filter(Boolean);
  const fmtAmount = (v: number | string) => `${Number(v).toLocaleString()} 万元`;
  const hasInvestmentDetails = Boolean(
    f.legalEntityName || f.investmentRatio || f.valuationAmount || f.originalTarget || f.newTarget || f.changeReason,
  );

  return (
    <div className="border-t border-gray-100">
      {/* 项目信息 */}
      <DetailSection title="项目信息">
        <DetailRow label="备案类型" value={FILING_TYPE_LABELS[f.type] ?? f.type} />
        {f.projectStage && (
          <DetailRow label="项目阶段" value={PROJECT_STAGE_LABELS[f.projectStage] ?? f.projectStage} />
        )}
        {f.domain && <DetailRow label="投资领域" value={f.domain} />}
        {f.projectName && <DetailRow label="项目名称" value={f.projectName} />}
        {f.projectCode && <DetailRow label="项目编号" value={f.projectCode} mono />}
        {f.industry && <DetailRow label="产业" value={f.industry} />}
        <DetailRow label="金额" value={fmtAmount(f.amount)} highlight />
      </DetailSection>

      {/* 投资细节（条件渲染，无字段则不显示整段） */}
      {hasInvestmentDetails && (
        <DetailSection title="投资细节">
          {f.legalEntityName && <DetailRow label="法人主体" value={f.legalEntityName} />}
          {f.investmentRatio !== '' && <DetailRow label="投资比例" value={`${f.investmentRatio}%`} />}
          {f.valuationAmount !== '' && <DetailRow label="估值金额" value={fmtAmount(f.valuationAmount)} />}
          {f.originalTarget !== '' && <DetailRow label="原对赌目标" value={fmtAmount(f.originalTarget)} />}
          {f.newTarget !== '' && <DetailRow label="新对赌目标" value={fmtAmount(f.newTarget)} />}
          {f.changeReason && <DetailRow label="变更原因" value={f.changeReason} block />}
          {f.filingTime && (
            <DetailRow label="备案时间" value={new Date(f.filingTime).toLocaleString('zh-CN')} />
          )}
        </DetailSection>
      )}

      {/* 备案具体事项 */}
      {f.description && (
        <DetailSection title="备案具体事项">
          <div className="text-sm leading-relaxed text-gray-700">
            {isHtml ? (
              <RichTextDisplay html={f.description} />
            ) : (
              <p className="whitespace-pre-wrap">{f.description}</p>
            )}
          </div>
        </DetailSection>
      )}

      {/* 邮件抄送 */}
      {recipients.length > 0 && (
        <DetailSection title="邮件业务收件人">
          <div className="flex flex-wrap gap-1.5">
            {recipients.map((uid) => (
              <span
                key={uid}
                className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
              >
                {uid}
              </span>
            ))}
          </div>
        </DetailSection>
      )}

    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-gray-50 px-4 py-4 last:border-b-0">
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
  mono = false,
  block = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  block?: boolean;
}) {
  if (block) {
    return (
      <div>
        <div className="mb-1 text-xs text-gray-400">{label}</div>
        <div className="text-sm leading-relaxed text-gray-700">{value}</div>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-gray-400">{label}</span>
      <span
        className={`text-right ${highlight ? 'font-medium text-gray-900' : 'text-gray-700'} ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
