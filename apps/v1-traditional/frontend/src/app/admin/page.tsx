'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { api, getCurrentUser } from '@/lib/api';
import { APPROVAL_GROUP_LABELS } from '@/lib/constants';

const ALL_GROUPS = ['finance', 'hr', 'strategy', 'legal', 'audit', 'confirmation'] as const;
const GROUP_LABELS: Record<string, string> = {
  ...APPROVAL_GROUP_LABELS,
  confirmation: '最终确认人',
};
const CC_GROUPS = ['finance', 'hr', 'strategy', 'legal', 'audit'] as const;

type TabKey = 'approval' | 'emailCc';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('approval');
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  if (currentUser?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">管理后台</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <TabBtn active={tab === 'approval'} onClick={() => setTab('approval')}>审批节点配置</TabBtn>
          <TabBtn active={tab === 'emailCc'} onClick={() => setTab('emailCc')}>邮件抄送名单</TabBtn>
        </div>

        {tab === 'approval' ? <ApprovalConfigTab /> : <EmailCcConfigTab />}
      </main>
    </div>
  );
}

// ─── 审批节点配置 Tab ─────────────────────────────────

function ApprovalConfigTab() {
  const [configs, setConfigs] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [form, setForm] = useState({ userName: '', userEmail: '' });

  const load = useCallback(async () => {
    try {
      const data = await api.getApprovalConfigs();
      setConfigs(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(groupName: string) {
    if (!form.userName || !form.userEmail) return;
    try {
      await api.addApprovalConfig({ groupName, userId: '', userName: form.userName, userEmail: form.userEmail });
      setAdding(null);
      setForm({ userName: '', userEmail: '' });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '添加失败');
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('确认删除此审批人配置？')) return;
    try {
      await api.removeApprovalConfig(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {ALL_GROUPS.map((group) => {
        const items = configs[group] ?? [];
        return (
          <div key={group} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{GROUP_LABELS[group]}</h3>
              <button
                onClick={() => { setAdding(adding === group ? null : group); setForm({ userName: '', userEmail: '' }); }}
                className="text-xs text-[#0066CC] hover:underline"
              >
                {adding === group ? '取消' : '+ 添加'}
              </button>
            </div>

            {items.length === 0 && adding !== group && (
              <p className="text-sm text-gray-300">暂无配置</p>
            )}

            {items.map((item) => (
              <div key={item.id as string} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="text-sm">
                  <span className="text-gray-700">{item.userName as string}</span>
                  <span className="ml-2 text-gray-400">{item.userEmail as string}</span>
                </div>
                <button onClick={() => handleRemove(item.id as string)} className="text-xs text-red-400 hover:text-red-600">删除</button>
              </div>
            ))}

            {adding === group && (
              <div className="flex items-end gap-2 mt-2 pt-2 border-t border-gray-100">
                <div className="flex-1">
                  <label className="text-xs text-gray-400">姓名</label>
                  <input value={form.userName} onChange={(e) => setForm(p => ({ ...p, userName: e.target.value }))}
                    className="form-input mt-0.5" placeholder="审批人姓名" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">邮箱</label>
                  <input value={form.userEmail} onChange={(e) => setForm(p => ({ ...p, userEmail: e.target.value }))}
                    className="form-input mt-0.5" placeholder="邮箱地址" />
                </div>
                <button
                  onClick={() => handleAdd(group)}
                  className="rounded-md bg-[#0066CC] px-3 py-2 text-sm text-white hover:bg-[#0055AA]"
                >
                  确认
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 邮件抄送名单 Tab ────────────────────────────────

function EmailCcConfigTab() {
  const [configs, setConfigs] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '' });

  const load = useCallback(async () => {
    try {
      const data = await api.getEmailCcConfigs();
      setConfigs(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(groupName: string) {
    if (!form.name || !form.email) return;
    try {
      await api.addEmailCcConfig({ groupName, name: form.name, email: form.email });
      setAdding(null);
      setForm({ name: '', email: '' });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '添加失败');
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('确认删除此抄送人？')) return;
    try {
      await api.removeEmailCcConfig(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {CC_GROUPS.map((group) => {
        const items = configs[group] ?? [];
        return (
          <div key={group} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{GROUP_LABELS[group]}</h3>
              <button
                onClick={() => { setAdding(adding === group ? null : group); setForm({ name: '', email: '' }); }}
                className="text-xs text-[#0066CC] hover:underline"
              >
                {adding === group ? '取消' : '+ 添加'}
              </button>
            </div>

            {items.length === 0 && adding !== group && (
              <p className="text-sm text-gray-300">暂无配置</p>
            )}

            {items.map((item) => (
              <div key={item.id as string} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="text-sm">
                  <span className="text-gray-700">{item.name as string}</span>
                  <span className="ml-2 text-gray-400">{item.email as string}</span>
                </div>
                <button onClick={() => handleRemove(item.id as string)} className="text-xs text-red-400 hover:text-red-600">删除</button>
              </div>
            ))}

            {adding === group && (
              <div className="flex items-end gap-2 mt-2 pt-2 border-t border-gray-100">
                <div className="flex-1">
                  <label className="text-xs text-gray-400">姓名</label>
                  <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    className="form-input mt-0.5" placeholder="抄送人姓名" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">邮箱</label>
                  <input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    className="form-input mt-0.5" placeholder="邮箱地址" />
                </div>
                <button
                  onClick={() => handleAdd(group)}
                  className="rounded-md bg-[#0066CC] px-3 py-2 text-sm text-white hover:bg-[#0055AA]"
                >
                  确认
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared components ───────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-[#0066CC] text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#0066CC]" />
    </div>
  );
}
