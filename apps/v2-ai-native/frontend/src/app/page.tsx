'use client';

import { useEffect, useState } from 'react';
import { api, setCurrentUser } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string; role: string; department: string; domain: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  function handleLogin(user: typeof users[number]) {
    setCurrentUser(user);
    router.push('/chat');
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">加载中...</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-lg">
            AI
          </div>
          <h1 className="text-2xl font-bold text-gray-900">投资项目备案管理系统</h1>
          <p className="mt-2 text-sm text-gray-500">V2 AI 原生版 -- 选择角色登录</p>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleLogin(user)}
              className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold">
                {user.name[0]}
              </div>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-500">
                  {user.department} · {user.role === 'initiator' ? '发起人' : user.role === 'supervisor' ? '审批人(上级)' : user.role === 'group_approver' ? '审批人(集团)' : user.role === 'admin' ? '管理员' : '管理层'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
