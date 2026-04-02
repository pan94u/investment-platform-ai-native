'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { EmailPreviewModal } from '@/components/email-preview-modal';
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
  const [emailPreviewTarget, setEmailPreviewTarget] = useState<{ approvalId: string; filingId: string } | null>(null);
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
    // confirmation 阶段同意 → 弹出邮件预览
    if (action === 'approve') {
      const todo = todos.find(t => t.approvalId === approvalId);
      if (todo?.stage === 'confirmation') {
        setEmailPreviewTarget({ approvalId, filingId: todo.filingId });
        return;
      }
    }

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
    <div className="min-h-screen bg-[#FAFAF9]">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">审批待办</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {loading ? '加载中...' : `共 ${todos.length} 条待办`}
            </p>
          </div>
          {todos.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.size === todos.length && todos.length > 0}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-gray-900"
                />
                全选
              </label>
              {selected.size > 0 && (
                <button
                  onClick={handleBatchApprove}
                  disabled={batchProcessing}
                  className="rounded-md bg-[#0066CC] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#0055AA] disabled:opacity-50"
                >
                  {batchProcessing ? '处理中...' : `批量同意 (${selected.size})`}
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
          </div>
        ) : todos.length === 0 ? (
          <div className="card flex flex-col items-center py-16">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">暂无待审批事项</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todos.map((todo) => {
              const isActive = activeId === todo.approvalId;
              return (
                <div
                  key={todo.approvalId}
                  className={`card overflow-hidden transition-shadow ${isActive ? 'ring-1 ring-gray-300' : ''}`}
                >
                  <div className="flex">
                    {/* Checkbox */}
                    <div className="flex shrink-0 items-start pt-4 pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(todo.approvalId)}
                        onChange={() => toggleSelect(todo.approvalId)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-gray-900"
                      />
                    </div>

                    <div className="flex-1 px-4 py-4">
                      {/* Title & meta */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            href={`/filings/${todo.filingId}`}
                            className="text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            {todo.filingTitle}
                          </Link>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Tag>{todo.filingNumber}</Tag>
                            <Tag>{FILING_TYPE_LABELS[todo.filingType] ?? todo.filingType}</Tag>
                            <Tag>{DOMAIN_LABELS[todo.domain] ?? todo.domain}</Tag>
                            <Tag accent>{Number(todo.amount).toLocaleString()}万元</Tag>
                          </div>
                        </div>
                        <span className={`badge shrink-0 ${
                          todo.stage === 'business' ? 'bg-blue-50 text-blue-600' :
                          todo.stage === 'group' ? 'bg-violet-50 text-violet-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {STAGE_LABELS[todo.stage] ?? todo.stage}
                          {todo.groupName ? ` · ${APPROVAL_GROUP_LABELS[todo.groupName] ?? todo.groupName}` : ''}
                          {todo.stage === 'business' ? ` L${todo.level}` : ''}
                        </span>
                      </div>

                      <div className="mt-1.5 text-xs text-gray-400">
                        发起人 {todo.creatorName}
                        <span className="mx-1.5">·</span>
                        提交于 {new Date(todo.submittedAt).toLocaleDateString('zh-CN')}
                      </div>

                      {/* Action area */}
                      {isActive ? (
                        <div className="mt-3 rounded-md bg-gray-50 p-3.5">
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="审批意见（选填）"
                            className="form-input min-h-[64px] resize-none bg-white text-sm"
                            rows={2}
                          />
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              onClick={() => handleAction(todo.approvalId, 'approve')}
                              disabled={processing === todo.approvalId}
                              className="rounded-md bg-[#0066CC] px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-[#0055AA] disabled:opacity-50"
                            >
                              同意
                            </button>
                            <button
                              onClick={() => handleAction(todo.approvalId, 'reject')}
                              disabled={processing === todo.approvalId}
                              className="rounded-md border border-red-200 px-3.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              驳回
                            </button>
                            <button
                              onClick={() => handleAction(todo.approvalId, 'acknowledge')}
                              disabled={processing === todo.approvalId}
                              className="rounded-md border border-gray-200 px-3.5 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                              知悉
                            </button>
                            <button
                              onClick={() => { setActiveId(null); setComment(''); }}
                              className="ml-1 rounded-md px-2.5 py-1.5 text-sm text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => setActiveId(todo.approvalId)}
                            className="rounded-md border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                          >
                            处理审批
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setReassignId(todo.approvalId)}
                              className="rounded-md border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                            >
                              改派
                            </button>
                          )}
                        </div>
                      )}

                      {/* Reassign panel */}
                      {reassignId === todo.approvalId && (
                        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3.5">
                          <p className="mb-2 text-sm font-medium text-gray-700">改派审批人</p>
                          <select
                            value={reassignTarget}
                            onChange={(e) => setReassignTarget(e.target.value)}
                            className="form-input form-select w-full bg-white text-sm"
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
                            className="form-input mt-2 bg-white text-sm"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => handleReassign(todo.approvalId)}
                              disabled={!reassignTarget}
                              className="rounded-md bg-[#0066CC] px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-[#0055AA] disabled:opacity-50"
                            >
                              确认改派
                            </button>
                            <button
                              onClick={() => { setReassignId(null); setReassignTarget(''); setReassignReason(''); }}
                              className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
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
        {emailPreviewTarget && (
          <EmailPreviewModal
            filingId={emailPreviewTarget.filingId}
            approvalId={emailPreviewTarget.approvalId}
            comment={comment}
            onClose={() => setEmailPreviewTarget(null)}
            onSuccess={() => {
              setEmailPreviewTarget(null);
              setComment('');
              setActiveId(null);
              loadTodos();
            }}
          />
        )}
      </main>
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${
      accent
        ? 'bg-amber-50 font-medium text-amber-700'
        : 'bg-gray-100 text-gray-500'
    }`}>
      {children}
    </span>
  );
}
