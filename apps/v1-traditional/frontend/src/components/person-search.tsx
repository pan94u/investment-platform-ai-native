'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export interface PersonInfo {
  empCode: string;
  name: string;
  email: string;
  department: string;
}

interface PersonSearchProps {
  /** 选中回调 */
  onSelect: (person: PersonInfo) => void;
  /** placeholder */
  placeholder?: string;
}

export function PersonSearch({ onSelect, placeholder }: PersonSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await api.searchUsers(query);
        setResults(list.map(u => ({
          empCode: u.empCode ?? u.id,
          name: u.name,
          email: (u as Record<string, unknown>).email as string ?? '',
          department: u.department,
        })));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(p: PersonInfo) {
    onSelect(p);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (query.length >= 2) setOpen(true); }}
        placeholder={placeholder ?? '输入姓名或工号搜索...'}
        className="form-input mt-0.5"
      />
      {open && query.length >= 2 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">搜索中...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">未找到匹配人员</div>
          ) : (
            results.map((r) => (
              <button
                key={r.empCode}
                type="button"
                onClick={() => select(r)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50"
              >
                <span className="text-gray-700">{r.name}</span>
                <span className="ml-2 text-xs text-gray-400">{r.department}{r.email ? ` · ${r.email}` : ''}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
