'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { FileUpload } from '@/components/file-upload';
import { RichTextEditor } from '@/components/rich-text-editor';
import { ProjectAutocomplete } from '@/components/project-autocomplete';
import { api, getCurrentUser } from '@/lib/api';
import { RecipientPicker } from '@/components/recipient-picker';
import {
  FILING_TYPE_LABELS, PROJECT_STAGE_LABELS, TYPE_ALLOWED_STAGES,
  APPROVAL_GROUP_LABELS, APPROVAL_GROUPS,
  PROJECT_CATEGORY_LABELS, AMOUNT_TOOLTIP,
} from '@/lib/constants';

export default function EditFilingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [domains, setDomains] = useState<Array<{ code: string; name: string }>>([]);
  const [industries, setIndustries] = useState<Array<{ code: string; name: string }>>([]);
  const currentUser = getCurrentUser();
  const [form, setForm] = useState({
    type: '',
    projectStage: '',
    projectCategory: '',
    title: '',
    description: '',
    projectName: '',
    projectCode: '',
    domain: '',
    domainCode: '',
    industry: '',
    amount: '',
    approvalGroups: [] as string[],
    emailRecipients: [] as string[],
  });

  useEffect(() => {
    api.getOrgDomains().then(setDomains).catch(() => {});
  }, []);

  // 领域变化时加载行业
  useEffect(() => {
    if (form.domainCode) {
      api.getOrgIndustries(form.domainCode).then(setIndustries).catch(() => setIndustries([]));
    }
  }, [form.domainCode]);

  useEffect(() => {
    api.getFiling(id).then((f) => {
      if (!f) { router.push('/filings'); return; }
      if (f.status !== 'draft') { router.push(`/filings/${id}`); return; }
      setForm({
        type: (f.type as string) || '',
        projectStage: (f.projectStage as string) || 'invest',
        projectCategory: (f.projectCategory as string) || '',
        title: (f.title as string) || '',
        description: (f.description as string) || '',
        projectName: (f.projectName as string) || '',
        projectCode: (f.projectCode as string) || '',
        domain: (f.domain as string) || '',
        domainCode: (f.domainCode as string) || '',
        industry: (f.industry as string) || '',
        amount: f.amount ? String(Number(f.amount)) : '',
        approvalGroups: (f.approvalGroups as string[]) || [],
        emailRecipients: (f.emailRecipients as string[]) || [],
      });
    }).finally(() => setLoading(false));
  }, [id, router]);

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
    setSaving(true);
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

      await api.updateFiling(id, data);
      if (andSubmit) {
        await api.submitFiling(id);
      }
      router.push(`/filings/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#0066CC]" />
        </div>
      </div>
    );
  }

  const allowedStages = TYPE_ALLOWED_STAGES[form.type] ?? [];

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">编辑备案</h1>
              <p className="mt-1 text-sm text-gray-400">{FILING_TYPE_LABELS[form.type]} · 修改后可重新提交审批</p>
            </div>
            <button onClick={() => router.push(`/filings/${id}`)} className="text-sm text-gray-400 hover:text-[#0066CC]">
              返回详情 &rarr;
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <div className="card space-y-5 p-6">
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
                  {domains.map((d) => (<option key={d.code} value={d.code}>{d.name}</option>))}
                </select>
              </Field>
              <Field label="行业" required>
                <select value={form.industry} onChange={(e) => update('industry', e.target.value)} className="form-input form-select">
                  <option value="">请选择</option>
                  {industries.map((i) => (<option key={i.code} value={i.name}>{i.name}</option>))}
                </select>
              </Field>
            </div>

            {/* 2. 项目类型 */}
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
              />
            </Field>

            {/* 4. 项目编号 */}
            <Field label="项目编号">
              <input value={form.projectCode} onChange={(e) => update('projectCode', e.target.value)} className="form-input" placeholder="自动生成或手工输入" />
            </Field>

            {/* 5. 项目阶段 */}
            {allowedStages.length > 1 && (
              <Field label="项目阶段" required>
                <div className="flex gap-2 flex-wrap">
                  {allowedStages.map((s) => (
                    <button key={s} onClick={() => update('projectStage', s)}
                      className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
                        form.projectStage === s ? 'border-[#0066CC] bg-blue-50 text-[#0066CC]' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
                      }`}>{PROJECT_STAGE_LABELS[s]}</button>
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

            {/* 7. 备案发起人 + 备案时间 */}
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
              <input value={form.title} onChange={(e) => update('title', e.target.value)} className="form-input" placeholder="一句话摘要" />
            </Field>

            {/* 9. 备案具体事项 */}
            <Field label="备案具体事项">
              <RichTextEditor
                value={form.description}
                onChange={(html) => update('description', html)}
                placeholder="项目背景、核心事项、关键数据"
              />
            </Field>

            <Field label="集团审批组" required>
              <div className="flex flex-wrap gap-2">
                {APPROVAL_GROUPS.map((g) => (
                  <button key={g} onClick={() => toggleGroup(g)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                      form.approvalGroups.includes(g) ? 'border-[#0066CC] bg-blue-50 text-[#0066CC]' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
                    }`}>{form.approvalGroups.includes(g) ? '✓ ' : ''}{APPROVAL_GROUP_LABELS[g]}</button>
                ))}
              </div>
            </Field>

            {/* 备案邮件业务收件人 */}
            <Field label="备案邮件业务收件人">
              <p className="mb-2 text-xs text-gray-400">备案完成后邮件发送给业务方的人员，输入姓名或工号可追加</p>
              <RecipientPicker
                value={form.emailRecipients}
                onChange={(ids) => update('emailRecipients', ids)}
              />
            </Field>
          </div>

          {/* 备案文件 */}
          <div className="card mt-5 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">备案文件</h3>
            <FileUpload filingId={id} />
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="rounded-md border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
              保存草稿
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="rounded-md bg-[#0066CC] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0055AA] disabled:opacity-50">
              保存并重新提交
            </button>
          </div>
        </div>
      </main>
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
