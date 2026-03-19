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
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#0066CC] text-xs font-bold text-white">
              投
            </div>
            <span className="text-base font-bold text-gray-800 tracking-tight">投资备案</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === '/filings'
                  ? pathname === '/filings' || (pathname.startsWith('/filings/') && pathname !== '/filings/new')
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'text-[#0066CC]'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute left-1/2 bottom-1.5 -translate-x-1/2 h-1 w-1 rounded-full bg-[#0066CC]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
              {user.name[0]}
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-600">{user.name}</span>
              <span className="mx-1.5 text-gray-200">|</span>
              <span className="text-gray-400">{user.department}</span>
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              退出
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
