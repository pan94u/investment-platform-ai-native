'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, setCurrentUser } from '@/lib/api';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: '数据看板', primary: true },
  { href: '/query', label: '智能查询', primary: false },
  { href: '/reports', label: '报告', primary: false },
  { href: '/filings', label: '备案列表', primary: false },
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
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-emerald-700">
            投资备案
            <span className="rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-1.5 py-0.5 text-xs font-bold text-white leading-tight">
              洞察
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
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-emerald-50 text-emerald-700'
                      : item.primary
                        ? 'text-emerald-600 hover:bg-emerald-50'
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
