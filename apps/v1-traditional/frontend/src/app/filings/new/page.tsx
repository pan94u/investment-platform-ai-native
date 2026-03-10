'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, DOMAIN_LABELS } from '@/lib/constants';

const INDUSTRIES: Record<string, string[]> = {
  smart_living: ['住居科技', '智能家居', '建筑科技'],
  industrial_finance: ['金融投资', '融资租赁', '保理'],
  health: ['医疗科技', '生物制药', '健康管理'],
};

export default function NewFilingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0: 选类型, 1: 填表单
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
    <div>
      <Nav />
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-xl font-bold">新建备案</h1>

        {step === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">第 1 步：选择备案类型</p>
            {Object.entries(FILING_TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { update('type', key); setStep(1); }}
                className="flex w-full items-center rounded-lg border border-gray-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50"
              >
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              第 2 步：填写 {FILING_TYPE_LABELS[form.type]} 信息
              <button onClick={() => setStep(0)} className="ml-2 text-blue-600 hover:underline">返回选择</button>
            </p>

            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
              <Field label="备案标题" required>
                <input value={form.title} onChange={(e) => update('title', e.target.value)} className="input" placeholder="如: 海川项目首次投资" />
              </Field>
              <Field label="项目名称" required>
                <input value={form.projectName} onChange={(e) => update('projectName', e.target.value)} className="input" />
              </Field>
              <Field label="法人主体">
                <input value={form.legalEntityName} onChange={(e) => update('legalEntityName', e.target.value)} className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="投资领域" required>
                  <select value={form.domain} onChange={(e) => { update('domain', e.target.value); update('industry', ''); }} className="input">
                    <option value="">请选择</option>
                    {Object.entries(DOMAIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="产业" required>
                  <select value={form.industry} onChange={(e) => update('industry', e.target.value)} className="input">
                    <option value="">请选择</option>
                    {(INDUSTRIES[form.domain] ?? []).map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="金额（万元）" required>
                <input type="number" value={form.amount} onChange={(e) => update('amount', e.target.value)} className="input" />
              </Field>

              {showDirectFields && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="投资比例 (%)">
                    <input type="number" value={form.investmentRatio} onChange={(e) => update('investmentRatio', e.target.value)} className="input" />
                  </Field>
                  <Field label="估值金额（万元）">
                    <input type="number" value={form.valuationAmount} onChange={(e) => update('valuationAmount', e.target.value)} className="input" />
                  </Field>
                </div>
              )}

              {showEarnoutFields && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="原对赌目标（万元）">
                      <input type="number" value={form.originalTarget} onChange={(e) => update('originalTarget', e.target.value)} className="input" />
                    </Field>
                    <Field label="新对赌目标（万元）">
                      <input type="number" value={form.newTarget} onChange={(e) => update('newTarget', e.target.value)} className="input" />
                    </Field>
                  </div>
                  <Field label="变更原因">
                    <textarea value={form.changeReason} onChange={(e) => update('changeReason', e.target.value)} className="input min-h-[80px]" />
                  </Field>
                </>
              )}

              <Field label="备注说明">
                <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="input min-h-[80px]" />
              </Field>
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleSave(false)} disabled={submitting} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                保存草稿
              </button>
              <button onClick={() => handleSave(true)} disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                保存并提交
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
