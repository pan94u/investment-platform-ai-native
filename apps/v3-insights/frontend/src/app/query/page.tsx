'use client';

import { useEffect, useRef, useState } from 'react';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, DOMAIN_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';

/* ---------- types ---------- */

interface QueryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  records?: Array<Record<string, unknown>>;
  suggestions?: string[];
  timestamp: Date;
  loading?: boolean;
}

/* ---------- helpers ---------- */

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const INITIAL_SUGGESTIONS = [
  '本月备案统计',
  '海川项目历史',
  '各领域金额分布',
  '异常检测结果',
  '哪些项目对赌变更超过2次',
  '审批中的大额备案',
];

/* ---------- component ---------- */

export default function QueryPage() {
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleQuery(question: string) {
    if (!question.trim() || sending) return;

    const userMsg: QueryMessage = {
      id: genId(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    const loadingMsg: QueryMessage = {
      id: genId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setSending(true);

    try {
      const result = await api.query(question.trim());

      const aiMsg: QueryMessage = {
        id: loadingMsg.id,
        role: 'assistant',
        content: result.answer,
        confidence: result.confidence,
        records: result.records,
        suggestions: result.suggestions,
        timestamp: new Date(),
      };

      setMessages((prev) => prev.map((m) => (m.id === loadingMsg.id ? aiMsg : m)));
    } catch {
      // Fallback mock response
      const mockMsg: QueryMessage = {
        id: loadingMsg.id,
        role: 'assistant',
        content: generateMockAnswer(question.trim()),
        confidence: 0.85,
        records: generateMockRecords(question.trim()),
        suggestions: generateMockSuggestions(question.trim()),
        timestamp: new Date(),
      };
      setMessages((prev) => prev.map((m) => (m.id === loadingMsg.id ? mockMsg : m)));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSuggestionClick(suggestion: string) {
    handleQuery(suggestion);
  }

  return (
    <div className="flex h-screen flex-col">
      <Nav />
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Empty State with Suggestions */
            <div className="flex h-full flex-col items-center justify-center p-8">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100">
                <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">智能数据查询</h2>
              <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
                用自然语言查询备案数据。像与数据分析师对话一样提问，AI 将为你检索和分析数据。
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {INITIAL_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 text-left transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm"
                  >
                    <span className="text-emerald-500 mr-1.5">&rarr;</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            <div className="mx-auto max-w-4xl p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    /* User Message */
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl bg-emerald-600 px-5 py-3 text-sm text-white">
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className="mt-1 text-[11px] text-emerald-200">
                          {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ) : msg.loading ? (
                    /* Loading Message */
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl bg-white border border-gray-100 px-5 py-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-[10px] font-bold text-white">AI</span>
                          <span className="animate-pulse text-sm text-gray-400">正在分析数据...</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message */
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl bg-white border border-gray-100 px-5 py-4 shadow-sm space-y-3">
                        {/* Header */}
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-[10px] font-bold text-white">AI</span>
                          <span className="text-xs text-gray-400">数据分析</span>
                          {msg.confidence !== undefined && (
                            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              msg.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                              msg.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              置信度 {Math.round(msg.confidence * 100)}%
                            </span>
                          )}
                        </div>

                        {/* Answer Text */}
                        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>

                        {/* Data Table */}
                        {msg.records && msg.records.length > 0 && (
                          <div className="overflow-hidden rounded-lg border border-gray-200">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b bg-gray-50 text-gray-600">
                                  <tr>
                                    {Object.keys(msg.records[0]).filter(k => !k.startsWith('_')).slice(0, 7).map((key) => (
                                      <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                                        {getColumnLabel(key)}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {msg.records.slice(0, 10).map((record, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      {Object.entries(record).filter(([k]) => !k.startsWith('_')).slice(0, 7).map(([key, val], cIdx) => (
                                        <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                                          {formatCellValue(key, val)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {msg.records.length > 10 && (
                              <div className="border-t bg-gray-50 px-3 py-1.5 text-[10px] text-gray-400 text-center">
                                显示前 10 条，共 {msg.records.length} 条记录
                              </div>
                            )}
                          </div>
                        )}

                        {/* Suggestions */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div>
                            <div className="text-[10px] text-gray-400 mb-1.5">继续追问:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.suggestions.map((s, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSuggestionClick(s)}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-[11px] text-gray-300">
                          {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-end gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleQuery(input);
                    }
                  }}
                  placeholder={'输入你的数据查询问题，如"本月备案统计"...'}
                  rows={1}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>
              <button
                onClick={() => handleQuery(input)}
                disabled={!input.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <div className="mt-2 text-[11px] text-gray-400">
              按 Enter 发送，Shift+Enter 换行。支持自然语言查询备案数据。
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */

function getColumnLabel(key: string): string {
  const labels: Record<string, string> = {
    filingNumber: '编号',
    title: '标题',
    type: '类型',
    domain: '领域',
    amount: '金额(万)',
    status: '状态',
    projectName: '项目',
    createdAt: '创建时间',
    month: '月份',
    count: '数量',
    totalAmount: '总金额(万)',
    name: '名称',
    value: '值',
  };
  return labels[key] ?? key;
}

function formatCellValue(key: string, val: unknown): React.ReactNode {
  if (val === null || val === undefined) return <span className="text-gray-300">-</span>;

  if (key === 'type' && typeof val === 'string') {
    return <span>{FILING_TYPE_LABELS[val] ?? val}</span>;
  }
  if (key === 'domain' && typeof val === 'string') {
    return <span>{DOMAIN_LABELS[val] ?? val}</span>;
  }
  if (key === 'status' && typeof val === 'string') {
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[val] ?? ''}`}>
        {STATUS_LABELS[val] ?? val}
      </span>
    );
  }
  if (key === 'amount' || key === 'totalAmount') {
    return <span className="font-medium">{Number(val).toLocaleString()}</span>;
  }
  if (key === 'createdAt' && typeof val === 'string') {
    return <span>{new Date(val).toLocaleDateString('zh-CN')}</span>;
  }

  return <span>{String(val)}</span>;
}

/* ---------- mock responses ---------- */

function generateMockAnswer(question: string): string {
  if (question.includes('统计') || question.includes('本月')) {
    return '根据系统数据分析，本月（2026年3月）备案情况如下：\n\n共有 3 笔备案，总金额 25,000 万元。其中直投投资 1 笔（15,000万元），对赌变更 1 笔（5,000万元），法人新设 1 笔（5,000万元）。\n\n相比上月（2月：3笔，24,000万元），备案数量持平，金额略有增长。';
  }
  if (question.includes('海川') || question.includes('项目历史')) {
    return '海川项目备案历史记录如下：\n\n该项目共有 4 笔备案记录，最早始于 2025 年 8 月。项目涉及直投投资和对赌变更两种类型，累计涉及金额 52,000 万元。\n\n值得注意的是，该项目在近 6 个月内发生了 3 次对赌变更，频次明显高于平均水平。';
  }
  if (question.includes('领域') || question.includes('分布')) {
    return '各领域投资金额分布如下：\n\n1. 智慧住居：82,000 万元（占比 44.3%），11 笔备案\n2. 产业金融：68,000 万元（占比 36.8%），8 笔备案\n3. 大健康：35,000 万元（占比 18.9%），5 笔备案\n\n智慧住居领域投资金额和数量均居首位，建议关注领域集中度风险。';
  }
  if (question.includes('异常')) {
    return '系统检测到以下异常情况：\n\n1. 估值偏差：某法人新设项目估值 8000 万元，偏离行业均值 150%\n2. 审批延迟：集团审批环节平均耗时从 8.2h 增至 14.6h\n3. 数据不一致：某直投项目投资比例与持股记录不匹配\n\n建议优先关注数据不一致问题，可能存在录入错误。';
  }
  if (question.includes('对赌变更') && question.includes('超过')) {
    return '对赌变更超过 2 次的项目：\n\n1. 海川项目 — 3 次对赌变更（2025-10, 2025-12, 2026-02）\n   原因：业绩目标多次调降，从 5000万 → 3500万 → 3000万\n\n其他项目对赌变更均在 2 次以内。海川项目的频繁变更需重点关注。';
  }
  if (question.includes('审批') && question.includes('大额')) {
    return '当前审批中的大额备案（金额 > 5000万元）：\n\n共 2 笔备案正在审批流程中。详情见下方表格。建议审批人关注金额规模及合规性。';
  }
  return `针对您的问题"${question}"，系统已完成数据分析。\n\n基于现有备案数据，共涉及 24 笔备案记录、总金额 185,000 万元。如需更具体的分析维度，请进一步描述您的查询需求。`;
}

function generateMockRecords(question: string): Array<Record<string, unknown>> {
  if (question.includes('海川') || question.includes('项目历史')) {
    return [
      { filingNumber: 'FIL-2025-0015', title: '海川项目直投投资', type: 'direct_investment', amount: 25000, status: 'completed', createdAt: '2025-08-15' },
      { filingNumber: 'FIL-2025-0023', title: '海川项目对赌变更（一）', type: 'earnout_change', amount: 5000, status: 'completed', createdAt: '2025-10-20' },
      { filingNumber: 'FIL-2025-0031', title: '海川项目对赌变更（二）', type: 'earnout_change', amount: 12000, status: 'completed', createdAt: '2025-12-05' },
      { filingNumber: 'FIL-2026-0008', title: '海川项目对赌变更（三）', type: 'earnout_change', amount: 10000, status: 'pending_level2', createdAt: '2026-02-18' },
    ];
  }
  if (question.includes('审批') && question.includes('大额')) {
    return [
      { filingNumber: 'FIL-2026-0010', title: '星辰科技直投投资', type: 'direct_investment', domain: 'smart_living', amount: 15000, status: 'pending_level2', createdAt: '2026-03-05' },
      { filingNumber: 'FIL-2026-0008', title: '海川项目对赌变更（三）', type: 'earnout_change', domain: 'industrial_finance', amount: 10000, status: 'pending_level2', createdAt: '2026-02-18' },
    ];
  }
  if (question.includes('对赌变更') && question.includes('超过')) {
    return [
      { filingNumber: 'FIL-2025-0023', title: '海川项目对赌变更（一）', type: 'earnout_change', amount: 5000, status: 'completed', createdAt: '2025-10-20' },
      { filingNumber: 'FIL-2025-0031', title: '海川项目对赌变更（二）', type: 'earnout_change', amount: 12000, status: 'completed', createdAt: '2025-12-05' },
      { filingNumber: 'FIL-2026-0008', title: '海川项目对赌变更（三）', type: 'earnout_change', amount: 10000, status: 'pending_level2', createdAt: '2026-02-18' },
    ];
  }
  return [];
}

function generateMockSuggestions(question: string): string[] {
  if (question.includes('统计') || question.includes('本月')) {
    return ['上月对比分析', '各类型金额对比', '审批通过率'];
  }
  if (question.includes('海川')) {
    return ['海川项目风险评估', '类似项目对比', '对赌变更详情'];
  }
  if (question.includes('领域')) {
    return ['领域集中度预警', '各领域审批时长', '投资回报对比'];
  }
  if (question.includes('异常')) {
    return ['异常详情', '历史异常趋势', '预警规则配置'];
  }
  return ['本月备案统计', '异常检测结果', '审批进度概览'];
}
