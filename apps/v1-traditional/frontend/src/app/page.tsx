'use client';

import { useEffect, useState } from 'react';
import { api, setCurrentUser } from '@/lib/api';
import { useRouter } from 'next/navigation';

const ROLE_LABELS: Record<string, string> = {
  initiator: '发起人',
  supervisor: '审批人(上级)',
  group_approver: '审批人(集团)',
  admin: '管理员',
  viewer: '管理层',
};

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<
    Array<{ id: string; username: string; name: string; role: string; department: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  function handleLogin(user: (typeof users)[number]) {
    setCurrentUser(user as Parameters<typeof setCurrentUser>[0]);
    router.push('/dashboard');
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
      <div className="w-full max-w-sm px-6">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0066CC] text-sm font-bold text-white">
            投
          </div>
          <h1 className="text-xl font-semibold text-gray-900">投资项目备案管理系统</h1>
          <p className="mt-1 text-sm text-gray-400">选择角色登录</p>
        </div>

        {/* User list */}
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleLogin(user)}
              className="card group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-all hover:shadow-md hover:ring-1 hover:ring-[#0066CC]/20"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500 transition-colors group-hover:bg-[#0066CC] group-hover:text-white">
                {user.name[0]}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {user.name}
                </div>
                <div className="text-xs text-gray-400">
                  {user.department}
                  <span className="mx-1">·</span>
                  {ROLE_LABELS[user.role] ?? user.role}
                </div>
              </div>
              <svg
                className="ml-auto shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
