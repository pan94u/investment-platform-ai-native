'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, DOMAIN_LABELS } from '@/lib/constants';
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
  level: number;
  submittedAt: string;
};

export default function ApprovalsPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  function loadTodos() {
    setLoading(true);
    api.getApprovalTodos().then((data) => setTodos(data as TodoItem[])).finally(() => setLoading(false));
  }

  useEffect(() => { loadTodos(); }, []);

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

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="mb-6 text-xl font-bold">审批待办 ({todos.length})</h1>

        {loading ? (
          <div className="py-12 text-center text-gray-400">加载中...</div>
        ) : todos.length === 0 ? (
          <div className="py-12 text-center text-gray-400">暂无待审批事项</div>
        ) : (
          <div className="space-y-4">
            {todos.map((todo) => (
              <div key={todo.approvalId} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/filings/${todo.filingId}`} className="text-lg font-medium text-blue-600 hover:underline">
                      {todo.filingTitle}
                    </Link>
                    <div className="mt-1 flex gap-4 text-sm text-gray-500">
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

                {activeId === todo.approvalId ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="审批意见（可选）"
                      className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-400 focus:outline-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(todo.approvalId, 'approve')}
                        disabled={processing === todo.approvalId}
                        className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        同意
                      </button>
                      <button
                        onClick={() => handleAction(todo.approvalId, 'reject')}
                        disabled={processing === todo.approvalId}
                        className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        驳回
                      </button>
                      <button onClick={() => { setActiveId(null); setComment(''); }} className="text-sm text-gray-400 hover:text-gray-600 ml-2">
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <button
                      onClick={() => setActiveId(todo.approvalId)}
                      className="rounded-lg border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                    >
                      处理审批
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
