'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  code: string;
}

interface ProjectAutocompleteProps {
  filingType: string;
  value: string;
  onChange: (name: string, code: string) => void;
  placeholder?: string;
}

export function ProjectAutocomplete({ filingType, value, onChange, placeholder }: ProjectAutocompleteProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const needsAutocomplete = ['equity_direct', 'fund_project', 'fund_investment', 'other'].includes(filingType);

  const loadProjects = useCallback(async () => {
    if (!needsAutocomplete) return;
    setLoading(true);
    try {
      const list = await api.getStrategicProjects(filingType);
      setProjects(list);
    } catch {
      setProjects([]);
      setManual(true); // API 不可用，降级手工填写
    } finally {
      setLoading(false);
    }
  }, [filingType, needsAutocomplete]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!value.trim()) {
      setFiltered(projects);
    } else {
      const q = value.toLowerCase();
      setFiltered(projects.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)));
    }
  }, [value, projects]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!needsAutocomplete || manual) {
    return (
      <div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value, '')}
          className="form-input"
          placeholder={placeholder ?? '请输入项目名称'}
        />
        {needsAutocomplete && manual && (
          <button
            type="button"
            onClick={() => { setManual(false); loadProjects(); }}
            className="mt-1 text-xs text-[#0066CC] hover:underline"
          >
            尝试从战投系统加载
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value, ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="form-input"
        placeholder={loading ? '加载项目列表...' : (placeholder ?? '输入项目名称搜索')}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setManual(true)}
          className="text-xs text-gray-400 hover:text-[#0066CC]"
          title="手工填写"
        >
          手工
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.name, p.code);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50"
            >
              <span className="text-gray-700">{p.name}</span>
              {p.code && <span className="ml-2 text-xs text-gray-400">{p.code}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
