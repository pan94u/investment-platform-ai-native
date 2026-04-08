'use client';

/**
 * 移动端待办列表（飞书 webview / 机器人通知 deep link）
 * 设计要点：无顶部 Nav、单列卡片、大字号、touch-friendly。
 * 桌面端复杂功能（批量、转交、邮件预览）走 /approvals 页面。
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FILING_TYPE_LABELS, STAGE_LABELS, APPROVAL_GROUP_LABELS } from '@/lib/constants';

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
};

export default function TodosPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getApprovalTodos()
      .then((data) => setTodos(data as TodoItem[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
        <h1 className="text-base font-medium text-gray-800">审批待办</h1>
        <p className="mt-0.5 text-xs text-gray-400">{loading ? '加载中…' : `${todos.length} 项待处理`}</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
        </div>
      ) : todos.length === 0 ? (
        <div className="flex flex-col items-center py-24">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">暂无待审批事项</p>
        </div>
      ) : (
        <ul className="space-y-2 p-3">
          {todos.map((todo) => (
            <li key={todo.approvalId}>
              <Link
                href={`/todos/${todo.approvalId}`}
                className="block rounded-lg border border-gray-100 bg-white p-4 transition active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-medium leading-snug text-gray-800">
                      {todo.filingTitle}
                    </h2>
                    <div className="mt-1 text-xs text-gray-400">
                      {todo.filingNumber}
                    </div>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      todo.stage === 'business'
                        ? 'bg-blue-50 text-blue-600'
                        : todo.stage === 'group'
                          ? 'bg-violet-50 text-violet-600'
                          : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {STAGE_LABELS[todo.stage] ?? todo.stage}
                    {todo.groupName ? ` · ${APPROVAL_GROUP_LABELS[todo.groupName] ?? todo.groupName}` : ''}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{FILING_TYPE_LABELS[todo.filingType] ?? todo.filingType}</span>
                  <span className="font-medium text-gray-700">
                    {Number(todo.amount).toLocaleString()} 万元
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                  <span>发起人 {todo.creatorName}</span>
                  <span>{new Date(todo.submittedAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
