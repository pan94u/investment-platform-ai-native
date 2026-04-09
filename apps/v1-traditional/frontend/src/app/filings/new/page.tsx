'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { FileUpload } from '@/components/file-upload';
import type { UploadedFileRef } from '@/components/file-upload';
import { RichTextEditor } from '@/components/rich-text-editor';
import { ProjectAutocomplete } from '@/components/project-autocomplete';
import { api, getCurrentUser } from '@/lib/api';
import { RecipientPicker } from '@/components/recipient-picker';
import {
  FILING_TYPE_LABELS, PROJECT_STAGE_LABELS, TYPE_ALLOWED_STAGES,
  APPROVAL_GROUP_LABELS, APPROVAL_GROUPS, STAGE_LABELS,
  PROJECT_CATEGORY_LABELS, AMOUNT_TOOLTIP,
} from '@/lib/constants';

const TYPE_META: Record<string, { icon: React.ReactNode; desc: string }> = {
  equity_direct: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    desc: '对标的公司进行直接股权投资',
  },
  fund_project: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>,
    desc: '通过基金投资的具体项目',
  },
  fund_investment: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>,
    desc: '基金层面的投资备案（新设/退出）',
  },
  legal_entity: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="22" x2="9" y2="2" /><line x1="15" y1="22" x2="15" y2="2" /><line x1="4" y1="12" x2="20" y2="12" /></svg>,
    desc: '设立新的投资法人主体',
  },
  other: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    desc: '内部股权交易、土地/园区等',
  },
};

type ChainPreview = {
  business: Array<{ userId: string; name: string; level: number }>;
  group: Array<{ userId: string; name: string; groupName: string }>;
  confirmation: { userId: string; name: string };
};

export default function NewFilingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRef[]>([]);
  const [form, setForm] = useState({
    type: '',
    projectStage: '',
    projectCategory: '',
    title: '',
    description: '',
    projectName: '',
    projectCode: '',
    domain: '',         // 存名称（field_name）
    domainCode: '',    // 存代码（field_code），用于查行业
    industry: '',
    amount: '',
    approvalGroups: [] as string[],
    emailRecipients: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [chainPreview, setChainPreview] = useState<ChainPreview | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [domains, setDomains] = useState<Array<{ code: string; name: string }>>([]);
  const [industries, setIndustries] = useState<Array<{ code: string; name: string }>>([]);

  const currentUser = getCurrentUser();

  // 加载系统用户列表 + 领域列表
  useEffect(() => {
    api.getOrgDomains().then(setDomains).catch(() => {});
  }, []);

  // 领域变化时加载行业列表
  useEffect(() => {
    if (form.domainCode) {
      api.getOrgIndustries(form.domainCode).then(setIndustries).catch(() => setIndustries([]));
    } else {
      setIndustries([]);
    }
  }, [form.domainCode]);

  const fetchChain = useCallback(async (domain: string, filingType: string, amount: string, groups: string[]) => {
    if (!domain) return;
    setChainLoading(true);
    try {
      const preview = await api.getApprovalChainPreview({
        domain,
        filingType,
        amount: amount || '0',
        approvalGroups: groups.join(','),
      });
      setChainPreview(preview);
      // 自动填充 emailRecipients = business 链上所有人
      const businessUserIds = preview.business.map((a: { userId: string }) => a.userId);
      setForm((prev) => ({ ...prev, emailRecipients: businessUserIds }));
    } catch {
      setChainPreview(null);
    } finally {
      setChainLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 1 && form.domain) {
      fetchChain(form.domain, form.type, form.amount, form.approvalGroups);
    }
  }, [step, form.domain, form.type, form.amount, form.approvalGroups, fetchChain]);

  function update(key: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleGroup(group: string) {
    setForm((prev) => {
      const groups = prev.approvalGroups.includes(group)
        ? prev.approvalGroups.filter(g => g !== group)
        : [...prev.approvalGroups, group];
      return { ...prev, approvalGroups: groups };
    });
  }

  async function handleSave(andSubmit: boolean) {
    setError('');
    setSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        type: form.type,
        projectStage: form.projectStage,
        title: form.title,
        description: form.description,
        projectName: form.projectName,
        domain: form.domain,
        industry: form.industry,
        amount: Number(form.amount),
        approvalGroups: form.approvalGroups,
        emailRecipients: form.emailRecipients,
      };
      if (form.projectCategory) data.projectCategory = form.projectCategory;
      if (form.projectCode) data.projectCode = form.projectCode;

      // 1. 创建 filing
      const filing = await api.createFiling(data);
      const filingId = filing.id as string;

      // 2. 注册已上传的附件
      for (const f of uploadedFiles) {
        await api.registerAttachment(filingId, f);
      }

      // 3. 提交或跳转
      if (andSubmit) {
        await api.submitFiling(filingId);
      }
      router.push(andSubmit ? '/filings' : `/filings/${filingId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  const allowedStages = TYPE_ALLOWED_STAGES[form.type] ?? [];

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-8"><div className="mx-auto max-w-4xl">
        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-3">
          <StepDot active={step === 0} done={step > 0} label="1" />
          <div className={`h-px flex-1 ${step > 0 ? 'bg-[#0066CC]' : 'bg-gray-200'}`} />
          <StepDot active={step === 1} done={false} label="2" />
        </div>

        {step === 0 ? (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900">选择备案类型</h1>
              <p className="mt-1 text-sm text-gray-400">请选择与本次投资事项匹配的备案类型</p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {Object.entries(FILING_TYPE_LABELS).map(([key, label]) => {
                const meta = TYPE_META[key];
                return (
                  <button
                    key={key}
                    onClick={() => { update('type', key); update('projectStage', TYPE_ALLOWED_STAGES[key]?.[0] ?? 'invest'); setStep(1); }}
                    className="card group flex items-start gap-3.5 p-4 text-left transition-all hover:shadow-md hover:ring-1 hover:ring-[#0066CC]/30"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors group-hover:text-gray-700">
                      {meta?.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</div>
                      <div className="mt-0.5 text-xs text-gray-400">{meta?.desc}</div>
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
                <h1 className="text-xl font-semibold text-gray-900">
                  填写{FILING_TYPE_LABELS[form.type]}信息
                </h1>
                <p className="mt-1 text-sm text-gray-400">请填写以下必要信息</p>
              </div>
              <button onClick={() => setStep(0)} className="text-sm text-gray-400 transition hover:text-gray-700">
                &larr; 返回选择
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <div className="card space-y-5 p-5">
              {/* 1. 投资领域 + 行业 */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="投资领域" required>
                  <select value={form.domainCode} onChange={(e) => {
                    const sel = domains.find(d => d.code === e.target.value);
                    update('domainCode', e.target.value);
                    update('domain', sel?.name ?? e.target.value);
                    update('industry', '');
                  }} className="form-input form-select">
                    <option value="">请选择</option>
                    {domains.map((d) => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="行业" required>
                  <select value={form.industry} onChange={(e) => update('industry', e.target.value)} className="form-input form-select">
                    <option value="">请选择</option>
                    {industries.map((i) => (
                      <option key={i.code} value={i.name}>{i.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* 2. 项目类型（新增 13 选项下拉） */}
              <Field label="项目类型" required>
                <select value={form.projectCategory} onChange={(e) => update('projectCategory', e.target.value)} className="form-input form-select">
                  <option value="">请选择项目类型</option>
                  {Object.entries(PROJECT_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </Field>

              {/* 3. 项目名称 */}
              <Field label="项目名称" required>
                <ProjectAutocomplete
                  filingType={form.type}
                  value={form.projectName}
                  onChange={(name, code) => {
                    update('projectName', name);
                    if (code) update('projectCode', code);
                  }}
                  placeholder="输入或选择项目名称"
                />
              </Field>

              {/* 4. 项目编号 */}
              <Field label="项目编号">
                <input value={form.projectCode} onChange={(e) => update('projectCode', e.target.value)} className="form-input" placeholder="自动生成或从战投系统带入" />
              </Field>

              {/* 5. 项目阶段（只有投/退） */}
              {allowedStages.length > 1 && (
                <Field label="项目阶段" required>
                  <div className="flex gap-2 flex-wrap">
                    {allowedStages.map((s) => (
                      <button
                        key={s}
                        onClick={() => update('projectStage', s)}
                        className={`rounded-md border px-3.5 py-1.5 text-sm font-medium transition ${
                          form.projectStage === s
                            ? 'border-[#0066CC] bg-[#0066CC] text-white'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {PROJECT_STAGE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {/* 6. 金额 + tooltip */}
              <Field label="项目涉及金额（万元）" required>
                <div className="relative">
                  <input type="number" value={form.amount} onChange={(e) => update('amount', e.target.value)} className="form-input pr-8"
                    placeholder={form.projectStage === 'exit' ? '请填写退出金额' : '请填写投资金额'} />
                  <div className="group absolute right-2.5 top-1/2 -translate-y-1/2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 cursor-help"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <div className="invisible group-hover:visible absolute right-0 bottom-full mb-1.5 w-56 rounded-md bg-gray-800 px-3 py-2 text-xs text-white shadow-lg z-10">
                      {AMOUNT_TOOLTIP}
                    </div>
                  </div>
                </div>
              </Field>

              {/* 7. 备案发起人（只读） + 备案时间（只读） */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="备案发起人">
                  <input value={currentUser?.name ?? '-'} readOnly className="form-input bg-gray-50 text-gray-500 cursor-not-allowed" />
                </Field>
                <Field label="备案时间">
                  <input value="提交后自动生成" readOnly className="form-input bg-gray-50 text-gray-400 cursor-not-allowed" />
                </Field>
              </div>

              {/* 8. 项目说明 */}
              <Field label="项目说明" required>
                <input value={form.title} onChange={(e) => update('title', e.target.value)} className="form-input" placeholder="一句话摘要，如：海川项目首次投资" />
              </Field>

              {/* 9. 备案具体事项 */}
              <Field label="备案具体事项">
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => update('description', html)}
                  placeholder="请清晰、完整、规范填写本次需备案的核心内容"
                />
              </Field>

              {/* 备案文件 */}
              <Field label="备案文件">
                <FileUpload onFilesChange={setUploadedFiles} />
              </Field>

              {/* 审批组勾选 */}
              <Field label="集团审批组" required>
                <p className="mb-2 text-xs text-gray-400">请勾选本次备案需要的审批组</p>
                <div className="flex flex-wrap gap-2">
                  {APPROVAL_GROUPS.map((g) => (
                    <button
                      key={g}
                      onClick={() => toggleGroup(g)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                        form.approvalGroups.includes(g)
                          ? 'border-[#0066CC] bg-blue-50 text-[#0066CC]'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {form.approvalGroups.includes(g) ? '✓ ' : ''}{APPROVAL_GROUP_LABELS[g]}
                    </button>
                  ))}
                </div>
              </Field>

              {/* 备案邮件业务收件人 */}
              <Field label="备案邮件业务收件人">
                <p className="mb-2 text-xs text-gray-400">备案完成后邮件发送给业务方的人员，默认为审批链上的人，输入姓名或工号可追加</p>
                <RecipientPicker
                  value={form.emailRecipients}
                  onChange={(ids) => update('emailRecipients', ids)}
                  nameMap={chainPreview ? new Map(
                    [...chainPreview.business.map(a => [a.userId, a.name] as const),
                     ...chainPreview.group.map(g => [g.userId, g.name] as const),
                     [chainPreview.confirmation.userId, chainPreview.confirmation.name] as const]
                  ) : undefined}
                />
              </Field>
            </div>

            {/* 审批流程预览 */}
            {form.domain && (
              <div className="mt-5 card p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  审批流程预览
                </h3>
                {chainLoading ? (
                  <p className="text-sm text-gray-400">加载审批链...</p>
                ) : !chainPreview ? (
                  <p className="text-sm text-gray-400">未匹配到审批人</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <ChainNode label="发起人" name={currentUser?.name ?? '我'} />
                    {chainPreview.business.map((a) => (
                      <ChainArrowNode key={a.userId} label={`业务L${a.level}`} name={a.name} />
                    ))}
                    {chainPreview.group.length > 0 && (
                      <>
                        <ChainDivider />
                        {chainPreview.group.map((g) => (
                          <ChainNode key={g.groupName} label={APPROVAL_GROUP_LABELS[g.groupName] ?? g.groupName} name={g.name} />
                        ))}
                      </>
                    )}
                    <ChainDivider />
                    <ChainNode label="确认人" name={chainPreview.confirmation.name} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0066CC]/30 shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
                    <span className="text-sm font-medium text-emerald-600">完成</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex gap-2.5">
              <button onClick={() => handleSave(false)} disabled={submitting}
                className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
                保存草稿
              </button>
              <button onClick={() => handleSave(true)} disabled={submitting}
                className="rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0055AA] active:bg-[#004488] disabled:opacity-50">
                保存并提交审批
              </button>
            </div>
          </>
        )}
      </div></main>
    </div>
  );
}

function ChainNode({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-blue-50/60 px-2.5 py-1.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0066CC]/10 text-xs font-semibold text-[#0066CC]">
        {name[0]}
      </div>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm font-medium text-gray-700">{name}</div>
      </div>
    </div>
  );
}

function ChainArrowNode({ label, name }: { label: string; name: string }) {
  return (
    <>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0066CC]/30 shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
      <ChainNode label={label} name={name} />
    </>
  );
}

function ChainDivider() {
  return <div className="mx-1 h-4 w-px bg-[#0066CC]/20" />;
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
      active ? 'bg-[#0066CC] text-white' : done ? 'bg-blue-100 text-[#0066CC]' : 'bg-gray-100 text-gray-400'
    }`}>
      {done ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : label}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-600">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
