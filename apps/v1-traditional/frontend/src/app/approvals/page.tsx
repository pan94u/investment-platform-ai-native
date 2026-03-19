'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { api, getCurrentUser } from '@/lib/api';
import { FILING_TYPE_LABELS, DOMAIN_LABELS, STAGE_LABELS, APPROVAL_GROUP_LABELS } from '@/lib/constants';
import Link from 'next/link';

type TodoItem = {
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
};

export default function ApprovalsPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

  function loadTodos() {
    setLoading(true);
    api
      .getApprovalTodos()
      .then((data) => setTodos(data as TodoItem[]))
      .finally(() => setLoading(false));
  }

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadTodos();
    if (isAdmin) {
      api.getUsers().then(setUsers).catch(() => {});
    }
  }, []);

  async function handleAction(approvalId: string, action: 'approve' | 'reject' | 'acknowledge') {
    setProcessing(approvalId);
    try {
      if (action === 'approve') {
        await api.approveApproval(approvalId, comment);
      } else if (action === 'reject') {
        await api.rejectApproval(approvalId, comment);
      } else {
        await api.acknowledgeApproval(approvalId, comment);
      }
      setComment('');
      setActiveId(null);
      setSelected((prev) => { const next = new Set(prev); next.delete(approvalId); return next; });
      loadTodos();
    } finally {
      setProcessing(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === todos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(todos.map((t) => t.approvalId)));
    }
  }

  async function handleBatchApprove() {
    if (selected.size === 0) return;
    if (!confirm(`确认批量同意 ${selected.size} 条审批？`)) return;
    setBatchProcessing(true);
    try {
      await api.batchApproveApprovals(Array.from(selected), comment);
      setSelected(new Set());
      setComment('');
      loadTodos();
    } finally {
      setBatchProcessing(false);
    }
  }

  async function handleReassign(approvalId: string) {
    if (!reassignTarget) return;
    try {
      await api.reassignApproval(approvalId, reassignTarget, reassignReason || undefined);
      setReassignId(null);
      setReassignTarget('');
      setReassignReason('');
      loadTodos();
    } catch (err) {
      alert(err instanceof Error ? err.message : '改派失败');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">审批待办</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {loading ? '加载中...' : `共 ${todos.length} 条待办`}
            </p>
          </div>
          {todos.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.size === todos.length && todos.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                全选
              </label>
              {selected.size > 0 && (
                <button
                  onClick={handleBatchApprove}
                  disabled={batchProcessing}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {batchProcessing ? '处理中...' : `批量同意 (${selected.size})`}
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : todos.length === 0 ? (
          <div className="card flex flex-col items-center py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="text-sm text-slate-400">暂无待审批事项</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todos.map((todo) => {
              const isActive = activeId === todo.approvalId;
              return (
                <div
                  key={todo.approvalId}
                  className={`card overflow-hidden transition-shadow ${isActive ? 'ring-2 ring-blue-400/30' : ''}`}
                >
                  <div className="flex">
                    {/* Checkbox */}
                    <div className="flex shrink-0 items-start pt-5 pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(todo.approvalId)}
                        onChange={() => toggleSelect(todo.approvalId)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </div>

                    {/* Stage accent */}
                    <div className={`ml-3 w-1 shrink-0 ${
                      todo.stage === 'business' ? 'bg-blue-500' :
                      todo.stage === 'group' ? 'bg-violet-500' : 'bg-green-500'
                    }`} />

                    <div className="flex-1 p-5">
                      {/* Title & meta */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            href={`/filings/${todo.filingId}`}
                            className="text-base font-medium text-slate-700 hover:text-blue-600"
                          >
                            {todo.filingTitle}
                          </Link>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Tag>{todo.filingNumber}</Tag>
                            <Tag>{FILING_TYPE_LABELS[todo.filingType] ?? todo.filingType}</Tag>
                            <Tag>{DOMAIN_LABELS[todo.domain] ?? todo.domain}</Tag>
                            <Tag accent>{Number(todo.amount).toLocaleString()}万元</Tag>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          todo.stage === 'business' ? 'bg-blue-50 text-blue-600' :
                          todo.stage === 'group' ? 'bg-violet-50 text-violet-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {STAGE_LABELS[todo.stage] ?? todo.stage}
                          {todo.groupName ? ` · ${APPROVAL_GROUP_LABELS[todo.groupName] ?? todo.groupName}` : ''}
                          {todo.stage === 'business' ? ` L${todo.level}` : ''}
                        </span>
                      </div>

                      <div className="mt-2 text-[13px] text-slate-400">
                        发起人 {todo.creatorName}
                        <span className="mx-1.5">·</span>
                        提交于 {new Date(todo.submittedAt).toLocaleDateString('zh-CN')}
                      </div>

                      {/* Action area */}
                      {isActive ? (
                        <div className="mt-4 rounded-lg bg-slate-50 p-4">
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="审批意见（选填）"
                            className="form-input min-h-[72px] resize-none bg-white"
                            rows={2}
                          />
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => handleAction(todo.approvalId, 'approve')}
                              disabled={processing === todo.approvalId}
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              同意
                            </button>
                            <button
                              onClick={() => handleAction(todo.approvalId, 'reject')}
                              disabled={processing === todo.approvalId}
                              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                            >
                              驳回
                            </button>
                            <button
                              onClick={() => handleAction(todo.approvalId, 'acknowledge')}
                              disabled={processing === todo.approvalId}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                            >
                              知悉
                            </button>
                            <button
                              onClick={() => { setActiveId(null); setComment(''); }}
                              className="ml-1 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={() => setActiveId(todo.approvalId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            处理审批
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setReassignId(todo.approvalId)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition hover:border-amber-300 hover:text-amber-600"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                              </svg>
                              改派
                            </button>
                          )}
                        </div>
                      )}

                      {/* Reassign panel */}
                      {reassignId === todo.approvalId && (
                        <div className="mt-3 rounded-lg bg-amber-50 p-4">
                          <p className="mb-2 text-sm font-medium text-amber-800">改派审批人</p>
                          <select
                            value={reassignTarget}
                            onChange={(e) => setReassignTarget(e.target.value)}
                            className="form-select w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">选择新审批人</option>
                            {users.filter((u) => u.id !== currentUser?.id).map((u) => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            value={reassignReason}
                            onChange={(e) => setReassignReason(e.target.value)}
                            placeholder="改派原因（选填）"
                            className="form-input mt-2 bg-white"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => handleReassign(todo.approvalId)}
                              disabled={!reassignTarget}
                              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
                            >
                              确认改派
                            </button>
                            <button
                              onClick={() => { setReassignId(null); setReassignTarget(''); setReassignReason(''); }}
                              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${
      accent
        ? 'bg-amber-50 font-semibold text-amber-700'
        : 'bg-slate-100 text-slate-500'
    }`}>
      {children}
    </span>
  );
}
