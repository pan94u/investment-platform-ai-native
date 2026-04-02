'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { FileUpload } from '@/components/file-upload';
import { RichTextEditor } from '@/components/rich-text-editor';
import { ProjectAutocomplete } from '@/components/project-autocomplete';
import { api, getCurrentUser } from '@/lib/api';
import {
  FILING_TYPE_LABELS, PROJECT_STAGE_LABELS, TYPE_ALLOWED_STAGES,
  DOMAIN_LABELS, APPROVAL_GROUP_LABELS, APPROVAL_GROUPS,
} from '@/lib/constants';

const INDUSTRIES: Record<string, string[]> = {
  smart_living: ['住居科技', '智能家居', '建筑科技'],
  industrial_finance: ['金融投资', '融资租赁', '保理'],
  health: ['医疗科技', '生物制药', '健康管理'],
};

export default function EditFilingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: '',
    projectStage: '',
    title: '',
    description: '',
    projectName: '',
    projectCode: '',
    legalEntityName: '',
    domain: '',
    industry: '',
    amount: '',
    investmentRatio: '',
    valuationAmount: '',
    originalTarget: '',
    newTarget: '',
    changeReason: '',
    approvalGroups: [] as string[],
    emailRecipients: [] as string[],
  });

  useEffect(() => {
    api.getFiling(id).then((f) => {
      if (!f) { router.push('/filings'); return; }
      if (f.status !== 'draft') { router.push(`/filings/${id}`); return; }
      setForm({
        type: (f.type as string) || '',
        projectStage: (f.projectStage as string) || 'invest',
        title: (f.title as string) || '',
        description: (f.description as string) || '',
        projectName: (f.projectName as string) || '',
        projectCode: (f.projectCode as string) || '',
        legalEntityName: (f.legalEntityName as string) || '',
        domain: (f.domain as string) || '',
        industry: (f.industry as string) || '',
        amount: f.amount ? String(Number(f.amount)) : '',
        investmentRatio: f.investmentRatio ? String(Number(f.investmentRatio)) : '',
        valuationAmount: f.valuationAmount ? String(Number(f.valuationAmount)) : '',
        originalTarget: f.originalTarget ? String(Number(f.originalTarget)) : '',
        newTarget: f.newTarget ? String(Number(f.newTarget)) : '',
        changeReason: (f.changeReason as string) || '',
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
      if (form.projectCode) data.projectCode = form.projectCode;
      if (form.legalEntityName) data.legalEntityName = form.legalEntityName;
      if (form.investmentRatio) data.investmentRatio = Number(form.investmentRatio);
      if (form.valuationAmount) data.valuationAmount = Number(form.valuationAmount);
      if (form.originalTarget) data.originalTarget = Number(form.originalTarget);
      if (form.newTarget) data.newTarget = Number(form.newTarget);
      if (form.changeReason) data.changeReason = form.changeReason;

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
  const showDirectFields = form.type === 'equity_direct' || form.type === 'legal_entity';
  const showEarnoutFields = form.projectStage === 'change';

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

            <Field label="项目说明" required>
              <input value={form.title} onChange={(e) => update('title', e.target.value)} className="form-input" placeholder="一句话摘要" />
            </Field>
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
            <Field label="项目编号">
              <input value={form.projectCode} onChange={(e) => update('projectCode', e.target.value)} className="form-input" placeholder="自动生成或手工输入" />
            </Field>
            <Field label="法人主体">
              <input value={form.legalEntityName} onChange={(e) => update('legalEntityName', e.target.value)} className="form-input" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="投资领域" required>
                <select value={form.domain} onChange={(e) => { update('domain', e.target.value); update('industry', ''); }} className="form-input form-select">
                  <option value="">请选择</option>
                  {Object.entries(DOMAIN_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </Field>
              <Field label="行业" required>
                <select value={form.industry} onChange={(e) => update('industry', e.target.value)} className="form-input form-select">
                  <option value="">请选择</option>
                  {(INDUSTRIES[form.domain] ?? []).map((i) => (<option key={i} value={i}>{i}</option>))}
                </select>
              </Field>
            </div>
            <Field label="项目涉及金额（万元）" required>
              <input type="number" value={form.amount} onChange={(e) => update('amount', e.target.value)} className="form-input" />
            </Field>

            {showDirectFields && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="投资比例 (%)">
                  <input type="number" value={form.investmentRatio} onChange={(e) => update('investmentRatio', e.target.value)} className="form-input" />
                </Field>
                <Field label="估值金额（万元）">
                  <input type="number" value={form.valuationAmount} onChange={(e) => update('valuationAmount', e.target.value)} className="form-input" />
                </Field>
              </div>
            )}

            {showEarnoutFields && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="原对赌目标（万元）">
                    <input type="number" value={form.originalTarget} onChange={(e) => update('originalTarget', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="新对赌目标（万元）">
                    <input type="number" value={form.newTarget} onChange={(e) => update('newTarget', e.target.value)} className="form-input" />
                  </Field>
                </div>
                <Field label="变更原因">
                  <textarea value={form.changeReason} onChange={(e) => update('changeReason', e.target.value)} className="form-input min-h-[72px] resize-none" />
                </Field>
              </>
            )}

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
