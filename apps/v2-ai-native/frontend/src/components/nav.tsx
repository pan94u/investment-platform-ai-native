'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, setCurrentUser } from '@/lib/api';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/chat', label: '对话备案', primary: true },
  { href: '/dashboard', label: '仪表盘', primary: false },
  { href: '/filings', label: '备案列表', primary: false },
  { href: '/approvals', label: '审批', primary: false },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; department: string } | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.push('/');
      return;
    }
    setUser(u);
  }, [router]);

  function handleLogout() {
    setCurrentUser(null);
    router.push('/');
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/chat" className="flex items-center gap-2 text-lg font-bold text-indigo-600">
            投资备案
            <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-xs font-bold text-white leading-tight">
              AI
            </span>
          </Link>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? item.primary
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-indigo-50 text-indigo-700'
                      : item.primary
                        ? 'text-indigo-600 hover:bg-indigo-50'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.name} · {user.department}</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500">
              退出
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
