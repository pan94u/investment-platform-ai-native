'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { api, getCurrentUser } from '@/lib/api';
import { FILING_TYPE_LABELS, DOMAIN_LABELS } from '@/lib/constants';

const INDUSTRIES: Record<string, string[]> = {
  smart_living: ['住居科技', '智能家居', '建筑科技'],
  industrial_finance: ['金融投资', '融资租赁', '保理'],
  health: ['医疗科技', '生物制药', '健康管理'],
};

const TYPE_META: Record<string, { icon: React.ReactNode; desc: string }> = {
  direct_investment: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    desc: '对标的公司进行直接股权投资',
  },
  earnout_change: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
      </svg>
    ),
    desc: '调整已有对赌协议的目标条款',
  },
  fund_exit: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
    desc: '基金项目退出清算',
  },
  legal_entity_setup: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="9" y1="22" x2="9" y2="2" /><line x1="15" y1="22" x2="15" y2="2" />
        <line x1="4" y1="12" x2="20" y2="12" />
      </svg>
    ),
    desc: '设立新的投资法人主体',
  },
  other_change: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    desc: '其他投资要素的变更申请',
  },
};

export default function NewFilingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    type: '',
    title: '',
    description: '',
    projectName: '',
    legalEntityName: '',
    domain: '',
    industry: '',
    amount: '',
    investmentRatio: '',
    valuationAmount: '',
    originalTarget: '',
    newTarget: '',
    changeReason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [approvalChain, setApprovalChain] = useState<Array<{ userId: string; name: string; level: number }>>([]);
  const [chainLoading, setChainLoading] = useState(false);

  const currentUser = getCurrentUser();

  const fetchChain = useCallback(async (domain: string, filingType: string, amount: string) => {
    if (!domain) return;
    setChainLoading(true);
    try {
      const chain = await api.getApprovalChainPreview({ domain, filingType, amount: amount || '0' });
      setApprovalChain(chain);
    } catch {
      setApprovalChain([]);
    } finally {
      setChainLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 1 && form.domain) {
      fetchChain(form.domain, form.type, form.amount);
    }
  }, [step, form.domain, form.type, form.amount, fetchChain]);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(andSubmit: boolean) {
    setError('');
    setSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        type: form.type,
        title: form.title,
        description: form.description,
        projectName: form.projectName,
        domain: form.domain,
        industry: form.industry,
        amount: Number(form.amount),
      };
      if (form.legalEntityName) data.legalEntityName = form.legalEntityName;
      if (form.investmentRatio) data.investmentRatio = Number(form.investmentRatio);
      if (form.valuationAmount) data.valuationAmount = Number(form.valuationAmount);
      if (form.originalTarget) data.originalTarget = Number(form.originalTarget);
      if (form.newTarget) data.newTarget = Number(form.newTarget);
      if (form.changeReason) data.changeReason = form.changeReason;

      const filing = await api.createFiling(data);
      if (andSubmit) {
        await api.submitFiling(filing.id as string);
      }
      router.push('/filings');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  const showDirectFields = form.type === 'direct_investment' || form.type === 'legal_entity_setup';
  const showEarnoutFields = form.type === 'earnout_change';

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-3">
          <StepDot active={step === 0} done={step > 0} label="1" />
          <div className={`h-px flex-1 ${step > 0 ? 'bg-blue-400' : 'bg-slate-200'}`} />
          <StepDot active={step === 1} done={false} label="2" />
        </div>

        {step === 0 ? (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-slate-800">选择备案类型</h1>
              <p className="mt-1 text-sm text-slate-400">请选择与本次投资事项匹配的备案类型</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(FILING_TYPE_LABELS).map(([key, label]) => {
                const meta = TYPE_META[key];
                return (
                  <button
                    key={key}
                    onClick={() => { update('type', key); setStep(1); }}
                    className="card group flex items-start gap-4 p-5 text-left transition-all hover:ring-2 hover:ring-blue-400/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                      {meta?.icon}
                    </div>
                    <div>
                      <div className="font-medium text-slate-700 group-hover:text-blue-600">{label}</div>
                      <div className="mt-0.5 text-[13px] text-slate-400">{meta?.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-800">
                  填写{FILING_TYPE_LABELS[form.type]}信息
                </h1>
                <p className="mt-1 text-sm text-slate-400">请填写以下必要信息</p>
              </div>
              <button
                onClick={() => setStep(0)}
                className="text-sm text-slate-400 transition hover:text-blue-600"
              >
                &larr; 返回选择
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="card space-y-5 p-6">
              <Field label="备案标题" required>
                <input
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="form-input"
                  placeholder="如：海川项目首次投资"
                />
              </Field>
              <Field label="项目名称" required>
                <input
                  value={form.projectName}
                  onChange={(e) => update('projectName', e.target.value)}
                  className="form-input"
                  placeholder="请输入项目名称"
                />
              </Field>
              <Field label="法人主体">
                <input
                  value={form.legalEntityName}
                  onChange={(e) => update('legalEntityName', e.target.value)}
                  className="form-input"
                  placeholder="请输入法人主体名称"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="投资领域" required>
                  <select
                    value={form.domain}
                    onChange={(e) => { update('domain', e.target.value); update('industry', ''); }}
                    className="form-input form-select"
                  >
                    <option value="">请选择</option>
                    {Object.entries(DOMAIN_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="产业" required>
                  <select
                    value={form.industry}
                    onChange={(e) => update('industry', e.target.value)}
                    className="form-input form-select"
                  >
                    <option value="">请选择</option>
                    {(INDUSTRIES[form.domain] ?? []).map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="金额（万元）" required>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => update('amount', e.target.value)}
                  className="form-input"
                  placeholder="请输入金额"
                />
              </Field>

              {showDirectFields && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="投资比例 (%)">
                    <input
                      type="number"
                      value={form.investmentRatio}
                      onChange={(e) => update('investmentRatio', e.target.value)}
                      className="form-input"
                      placeholder="如：30"
                    />
                  </Field>
                  <Field label="估值金额（万元）">
                    <input
                      type="number"
                      value={form.valuationAmount}
                      onChange={(e) => update('valuationAmount', e.target.value)}
                      className="form-input"
                      placeholder="请输入估值"
                    />
                  </Field>
                </div>
              )}

              {showEarnoutFields && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="原对赌目标（万元）">
                      <input
                        type="number"
                        value={form.originalTarget}
                        onChange={(e) => update('originalTarget', e.target.value)}
                        className="form-input"
                      />
                    </Field>
                    <Field label="新对赌目标（万元）">
                      <input
                        type="number"
                        value={form.newTarget}
                        onChange={(e) => update('newTarget', e.target.value)}
                        className="form-input"
                      />
                    </Field>
                  </div>
                  <Field label="变更原因">
                    <textarea
                      value={form.changeReason}
                      onChange={(e) => update('changeReason', e.target.value)}
                      className="form-input min-h-[80px] resize-none"
                      placeholder="请说明变更原因"
                    />
                  </Field>
                </>
              )}

              <Field label="备注说明">
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="form-input min-h-[80px] resize-none"
                  placeholder="选填，补充说明"
                />
              </Field>
            </div>

            {/* 审批流程预览 */}
            {form.domain && (
              <div className="mt-6 card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  审批流程
                </h3>
                {chainLoading ? (
                  <p className="text-sm text-slate-400">加载审批链...</p>
                ) : approvalChain.length === 0 ? (
                  <p className="text-sm text-slate-400">未匹配到审批人</p>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* 发起人 */}
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                        {currentUser?.name?.[0] ?? '我'}
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">发起人</div>
                        <div className="text-sm font-medium text-slate-700">{currentUser?.name ?? '我'}</div>
                      </div>
                    </div>

                    {approvalChain.map((approver) => (
                      <div key={approver.userId} className="flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 shrink-0">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                            approver.level === 1 ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
                          }`}>
                            {approver.name[0]}
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">
                              {approver.level === 1 ? '上级审批' : '集团审批'}
                              {approvalChain.length === 1 && ' (同人捏合)'}
                            </div>
                            <div className="text-sm font-medium text-slate-700">{approver.name}</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 shrink-0">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-sm font-medium text-green-700">完成</span>
                    </div>
                  </div>
                )}
                {currentUser?.role === 'admin' && (
                  <p className="mt-2 text-xs text-slate-400">管理员可在提交后通过审批待办页面改派审批人</p>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                保存草稿
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
              >
                保存并提交审批
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
        active
          ? 'bg-blue-600 text-white'
          : done
            ? 'bg-blue-100 text-blue-600'
            : 'bg-slate-100 text-slate-400'
      }`}
    >
      {done ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        label
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
