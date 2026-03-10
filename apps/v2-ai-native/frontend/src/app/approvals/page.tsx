'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, DOMAIN_LABELS, RISK_LABELS, RISK_COLORS, RISK_DOT_COLORS } from '@/lib/constants';
import Link from 'next/link';

/* ---------- types ---------- */

type TodoItem = {
  approvalId: string;
  filingId: string;
  filingNumber: string;
  filingTitle: string;
  filingType: string;
  creatorName: string;
  domain: string;
  amount: string;
  level: number;
  submittedAt: string;
};

type AISummary = {
  filingId: string;
  oneLiner: string;
  keyPoints: string[];
  riskHighlights: string[];
  attachmentSummary: string | null;
  suggestedOpinion: string;
  historicalContext: Array<{ filingNumber: string; type: string; date: string; summary: string }>;
};

type RiskResult = {
  level: 'low' | 'medium' | 'high';
  score: number;
  factors: Array<{ dimension: string; signal: string; value: string; description: string; weight: number }>;
  recommendation: string;
};

type EnrichedTodo = TodoItem & {
  aiSummary: AISummary | null;
  riskResult: RiskResult | null;
  aiLoading: boolean;
};

/* ---------- component ---------- */

export default function ApprovalsPage() {
  const [todos, setTodos] = useState<EnrichedTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<string>>>({});

  function toggleSection(approvalId: string, section: string) {
    setExpandedSections((prev) => {
      const next = { ...prev };
      const set = new Set(prev[approvalId] ?? []);
      if (set.has(section)) {
        set.delete(section);
      } else {
        set.add(section);
      }
      next[approvalId] = set;
      return next;
    });
  }

  function isSectionOpen(approvalId: string, section: string) {
    return expandedSections[approvalId]?.has(section) ?? false;
  }

  function loadTodos() {
    setLoading(true);
    api.getApprovalTodos()
      .then(async (data) => {
        const items = data as TodoItem[];
        const enriched: EnrichedTodo[] = items.map((item) => ({
          ...item,
          aiSummary: null,
          riskResult: null,
          aiLoading: true,
        }));
        setTodos(enriched);
        setLoading(false);

        // Fetch AI summaries for each item in parallel
        for (const item of items) {
          try {
            const [summaryResult, risk] = await Promise.all([
              api.aiSummary(item.filingId).catch(() => null),
              api.aiRiskAssess(item.filingId).catch(() => null),
            ]);
            // Map nested response to flat AISummary
            const aiSummary: AISummary | null = summaryResult ? {
              filingId: item.filingId,
              oneLiner: summaryResult.summary.oneLiner,
              keyPoints: summaryResult.summary.keyPoints,
              riskHighlights: summaryResult.summary.riskHighlights,
              attachmentSummary: summaryResult.summary.attachmentSummary,
              suggestedOpinion: summaryResult.opinionSuggestion,
              historicalContext: summaryResult.summary.historicalContext,
            } : null;
            setTodos((prev) =>
              prev.map((t) =>
                t.approvalId === item.approvalId
                  ? {
                      ...t,
                      aiSummary,
                      riskResult: risk as RiskResult | null,
                      aiLoading: false,
                    }
                  : t
              )
            );
          } catch {
            setTodos((prev) =>
              prev.map((t) =>
                t.approvalId === item.approvalId ? { ...t, aiLoading: false } : t
              )
            );
          }
        }
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadTodos();
  }, []);

  async function handleAction(approvalId: string, action: 'approve' | 'reject') {
    setProcessing(approvalId);
    try {
      if (action === 'approve') {
        await api.approveApproval(approvalId, comment);
      } else {
        await api.rejectApproval(approvalId, comment);
      }
      setComment('');
      setActiveId(null);
      loadTodos();
    } finally {
      setProcessing(null);
    }
  }

  function adoptSuggestion(opinion: string) {
    setComment(opinion);
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-6 text-xl font-bold">审批待办 ({todos.length})</h1>

        {loading ? (
          <div className="py-12 text-center text-gray-400">加载中...</div>
        ) : todos.length === 0 ? (
          <div className="py-12 text-center text-gray-400">暂无待审批事项</div>
        ) : (
          <div className="space-y-4">
            {todos.map((todo) => (
              <div key={todo.approvalId} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Link href={`/filings/${todo.filingId}`} className="text-lg font-medium text-indigo-600 hover:underline">
                          {todo.filingTitle}
                        </Link>
                        {todo.riskResult && (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${RISK_COLORS[todo.riskResult.level]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${RISK_DOT_COLORS[todo.riskResult.level]}`} />
                            {RISK_LABELS[todo.riskResult.level]}
                          </span>
                        )}
                      </div>

                      {/* AI one-liner */}
                      {todo.aiLoading ? (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-indigo-100 text-[8px] font-bold text-indigo-500">AI</span>
                          <span className="animate-pulse">正在生成摘要...</span>
                        </div>
                      ) : todo.aiSummary ? (
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2">
                          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-indigo-600 text-[8px] font-bold text-white">AI</span>
                          <p className="text-sm text-indigo-800">{todo.aiSummary.oneLiner}</p>
                        </div>
                      ) : null}

                      <div className="mt-2 flex gap-4 text-sm text-gray-500">
                        <span>{todo.filingNumber}</span>
                        <span>{FILING_TYPE_LABELS[todo.filingType] ?? todo.filingType}</span>
                        <span>{DOMAIN_LABELS[todo.domain] ?? todo.domain}</span>
                        <span>{Number(todo.amount).toLocaleString()}万元</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-400">
                        发起人: {todo.creatorName} · {todo.level === 1 ? '直属上级审批' : '集团审批'} · 提交于 {new Date(todo.submittedAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>

                  {/* Expandable sections */}
                  {todo.aiSummary && (
                    <div className="mt-4 space-y-1">
                      {/* AI Summary */}
                      <ExpandableSection
                        title="AI 摘要"
                        icon="summary"
                        isOpen={isSectionOpen(todo.approvalId, 'summary')}
                        onToggle={() => toggleSection(todo.approvalId, 'summary')}
                      >
                        <ul className="space-y-1">
                          {todo.aiSummary.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </ExpandableSection>

                      {/* Risk Panel */}
                      {todo.riskResult && (
                        <ExpandableSection
                          title="风险分析"
                          icon="risk"
                          isOpen={isSectionOpen(todo.approvalId, 'risk')}
                          onToggle={() => toggleSection(todo.approvalId, 'risk')}
                        >
                          <div className="space-y-2">
                            {todo.riskResult.factors.map((factor, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${RISK_DOT_COLORS[factor.signal] ?? 'bg-gray-400'}`} />
                                  <span className="text-gray-700">{factor.dimension}</span>
                                </div>
                                <span className="text-xs text-gray-500">{factor.description}</span>
                              </div>
                            ))}
                            <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                              {todo.riskResult.recommendation}
                            </div>
                          </div>
                        </ExpandableSection>
                      )}

                      {/* Risk Highlights */}
                      {todo.aiSummary.riskHighlights.length > 0 && (
                        <ExpandableSection
                          title="风险提示"
                          icon="warning"
                          isOpen={isSectionOpen(todo.approvalId, 'riskHighlights')}
                          onToggle={() => toggleSection(todo.approvalId, 'riskHighlights')}
                        >
                          <ul className="space-y-1">
                            {todo.aiSummary.riskHighlights.map((h, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                {h}
                              </li>
                            ))}
                          </ul>
                        </ExpandableSection>
                      )}

                      {/* Historical Context */}
                      {todo.aiSummary.historicalContext.length > 0 && (
                        <ExpandableSection
                          title="历史关联"
                          icon="history"
                          isOpen={isSectionOpen(todo.approvalId, 'history')}
                          onToggle={() => toggleSection(todo.approvalId, 'history')}
                        >
                          <div className="space-y-2">
                            {todo.aiSummary.historicalContext.map((item, i) => (
                              <div key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <span className="font-medium">{item.filingNumber}</span>
                                  <span className="text-xs text-gray-400">{item.date}</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">{item.summary}</p>
                              </div>
                            ))}
                          </div>
                        </ExpandableSection>
                      )}

                      {/* Attachment Summary */}
                      {todo.aiSummary.attachmentSummary && (
                        <ExpandableSection
                          title="附件摘要"
                          icon="attachment"
                          isOpen={isSectionOpen(todo.approvalId, 'attachment')}
                          onToggle={() => toggleSection(todo.approvalId, 'attachment')}
                        >
                          <p className="text-sm text-gray-600">{todo.aiSummary.attachmentSummary}</p>
                        </ExpandableSection>
                      )}

                      {/* Suggested Opinion */}
                      <ExpandableSection
                        title="AI 建议意见"
                        icon="suggestion"
                        isOpen={isSectionOpen(todo.approvalId, 'suggestion')}
                        onToggle={() => toggleSection(todo.approvalId, 'suggestion')}
                      >
                        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                          {todo.aiSummary.suggestedOpinion}
                        </div>
                        {activeId === todo.approvalId && (
                          <button
                            onClick={() => adoptSuggestion(todo.aiSummary!.suggestedOpinion)}
                            className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
                          >
                            采纳 AI 建议
                          </button>
                        )}
                      </ExpandableSection>
                    </div>
                  )}
                </div>

                {/* Action Area */}
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                  {activeId === todo.approvalId ? (
                    <div className="space-y-3">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="审批意见（可选）"
                        className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:border-indigo-400 focus:outline-none"
                        rows={2}
                      />
                      {todo.aiSummary && (
                        <button
                          onClick={() => adoptSuggestion(todo.aiSummary!.suggestedOpinion)}
                          className="text-xs font-medium text-indigo-600 hover:underline"
                        >
                          采纳 AI 建议意见
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(todo.approvalId, 'approve')}
                          disabled={processing === todo.approvalId}
                          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          同意
                        </button>
                        <button
                          onClick={() => handleAction(todo.approvalId, 'reject')}
                          disabled={processing === todo.approvalId}
                          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          驳回
                        </button>
                        <button
                          onClick={() => { setActiveId(null); setComment(''); }}
                          className="ml-2 text-sm text-gray-400 hover:text-gray-600"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveId(todo.approvalId)}
                      className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      处理审批
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- ExpandableSection ---------- */

function ExpandableSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const iconMap: Record<string, string> = {
    summary: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
    risk: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z',
    warning: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
    history: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    attachment: 'M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13',
    suggestion: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
  };

  return (
    <div className="rounded-lg border border-gray-100">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
      >
        <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={iconMap[icon] ?? iconMap.summary} />
        </svg>
        <span className="flex-1">{title}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {isOpen && <div className="border-t border-gray-100 px-3 py-3">{children}</div>}
    </div>
  );
}
