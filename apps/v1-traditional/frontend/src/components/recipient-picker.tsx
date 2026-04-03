'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface RecipientPickerProps {
  /** 已选收件人 ID（emp_code）列表 */
  value: string[];
  /** 变更回调 */
  onChange: (ids: string[]) => void;
  /** ID → 姓名映射（从审批链等来源预填） */
  nameMap?: Map<string, string>;
}

interface SearchResult {
  id: string;
  name: string;
  department: string;
}

export function RecipientPicker({ value, onChange, nameMap }: RecipientPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // 内部名称缓存（合并外部 nameMap + 搜索结果）
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 合并外部 nameMap
  useEffect(() => {
    if (nameMap) {
      setNames(prev => {
        const merged = new Map(prev);
        nameMap.forEach((v, k) => merged.set(k, v));
        return merged;
      });
    }
  }, [nameMap]);

  // 搜索
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await api.searchUsers(query);
        setResults(list.map(u => ({ id: u.id, name: u.name, department: u.department })));
        // 缓存姓名
        setNames(prev => {
          const next = new Map(prev);
          list.forEach(u => next.set(u.id, u.name));
          return next;
        });
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function add(id: string) {
    if (!value.includes(id)) {
      onChange([...value, id]);
    }
    setQuery('');
    setOpen(false);
  }

  function remove(id: string) {
    onChange(value.filter(v => v !== id));
  }

  function displayName(id: string): string {
    return names.get(id) ?? id;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5 min-h-[40px]">
        {value.map((uid) => (
          <span key={uid} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
            {displayName(uid)}
            <button type="button" onClick={() => remove(uid)}
              className="ml-0.5 text-blue-400 hover:text-blue-700 leading-none">&times;</button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          placeholder="输入姓名或工号搜索..."
          className="flex-1 min-w-[120px] border-none bg-transparent text-sm text-gray-500 outline-none"
        />
      </div>

      {open && (query.length >= 2) && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">搜索中...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">未找到匹配人员</div>
          ) : (
            results.filter(r => !value.includes(r.id)).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => add(r.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50"
              >
                <span className="text-gray-700">{r.name}</span>
                <span className="ml-2 text-xs text-gray-400">{r.department}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
