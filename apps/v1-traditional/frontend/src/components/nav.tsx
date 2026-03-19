'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, setCurrentUser } from '@/lib/api';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: '首页看板' },
  { href: '/filings', label: '备案列表' },
  { href: '/filings/new', label: '新建备案' },
  { href: '/approvals', label: '审批待办' },
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
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              投
            </div>
            <span className="text-base font-bold text-slate-800 tracking-tight">投资备案</span>
          </Link>
          <nav className="flex">
            {NAV_ITEMS.map((item) => {
              const active = item.href === '/filings/new'
                ? pathname === '/filings/new'
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-4 text-sm font-medium transition-colors ${
                    active
                      ? 'text-blue-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {user.name[0]}
            </div>
            <div className="text-sm">
              <span className="font-medium text-slate-700">{user.name}</span>
              <span className="mx-1.5 text-slate-200">|</span>
              <span className="text-slate-400">{user.department}</span>
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              退出
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
