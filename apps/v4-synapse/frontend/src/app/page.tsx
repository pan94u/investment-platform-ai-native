'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';

// ─── Types ──────────────────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  allowedTools: string[];
  systemPrompt: string;
}

interface ToolExecution {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  success: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolExecutions?: ToolExecution[];
  timestamp: Date;
}

// ─── Constants ──────────────────────────────────────────────────────

const API_BASE = '/api';
const MCP_BASE = process.env.NEXT_PUBLIC_V1_API_URL ?? 'http://localhost:3101';

const ROLE_LABELS: Record<string, string> = {
  initiator: '备案发起人',
  supervisor: '部门主管',
  group_approver: '集团审批人',
  admin: '系统管理员',
  viewer: '观察者',
};

const ROLE_COLORS: Record<string, string> = {
  initiator: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-amber-100 text-amber-700',
  group_approver: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  viewer: 'bg-slate-100 text-slate-600',
};

const TOOL_LABELS: Record<string, string> = {
  filing_create: '创建备案',
  filing_update: '更新备案',
  filing_submit: '提交备案',
  filing_recall: '撤回备案',
  filing_get: '查询备案',
  filing_list: '备案列表',
  filing_extract_from_doc: '文档提取',
  filing_risk_assess: '风险评估',
  filing_history: '历史记录',
  filing_stats: '统计数据',
  filing_anomaly_detect: '异常检测',
  approval_approve: '审批通过',
  approval_reject: '审批驳回',
  approval_todos: '待审批列表',
  approval_reassign: '改派审批',
  approval_batch: '批量审批',
};

const QUICK_PROMPTS: Record<string, string[]> = {
  'filing-initiator': [
    '帮我创建一个智慧住居领域的投资备案，项目名称"智能家居云平台"，金额3000万',
    '查看我的备案列表',
    '评估一下最近提交的备案风险',
    '从文档中提取备案信息',
  ],
  'filing-approver': [
    '查看我的待审批列表',
    '分析一下最近的备案统计数据',
    '检测是否有异常备案',
    '查看所有备案的风险分布',
  ],
  'filing-strategist': [
    '给我一份完整的投资组合分析',
    '检测金额异常的备案',
    '统计各领域、各类型的备案分布',
    '查看待审批列表并分析风险',
  ],
};

// ─── Component ──────────────────────────────────────────────────────

export default function SynapsePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // 加载用户列表
  useEffect(() => {
    fetch(`${MCP_BASE}/api/auth/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
      .catch(() => {});
  }, []);

  // 选择用户后加载 persona
  const selectUser = async (user: User) => {
    setSelectedUser(user);
    setMessages([]);
    try {
      const res = await fetch(`${MCP_BASE}/api/mcp/personas`, {
        headers: { 'X-User-Id': user.id },
      });
      const json = await res.json();
      if (json.success) {
        setPersona(json.data.persona);
        // 添加欢迎消息
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `你好，${user.name}！我是你的 **${json.data.persona.name}** 助手。\n\n${json.data.persona.description}\n\n我可以帮你使用 **${json.data.persona.allowedTools.length}** 个工具。请告诉我你需要什么帮助？`,
          timestamp: new Date(),
        }]);
      }
    } catch {
      setPersona(null);
    }
    inputRef.current?.focus();
  };

  // 发送消息
  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || !selectedUser || loading) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: msg });

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, userId: selectedUser.id }),
      });
      const json = await res.json();

      if (json.error) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `**错误**: ${json.error}`,
          timestamp: new Date(),
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: json.message,
          toolExecutions: json.toolExecutions,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**连接错误**: ${err instanceof Error ? err.message : '网络异常'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  // 用户选择界面
  if (!selectedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Synapse</h1>
            <p className="text-slate-500">投资管理 AI 原生平台 - 选择角色开始</p>
          </div>
          <div className="grid gap-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', ROLE_COLORS[user.role] ?? 'bg-slate-100')}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{user.department}</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-6">
            基于 V1 MCP 后端 - 16 个工具 / 3 个角色 / 6 层安全管道
          </p>
        </div>
      </div>
    );
  }

  // 聊天界面
  const personaId = persona?.id ?? 'filing-initiator';
  const quickPrompts = QUICK_PROMPTS[personaId] ?? QUICK_PROMPTS['filing-initiator'];

  return (
    <div className="h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => { setSelectedUser(null); setPersona(null); setMessages([]); }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="切换用户"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs">
          {selectedUser.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{selectedUser.name}</span>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', ROLE_COLORS[selectedUser.role])}>
              {ROLE_LABELS[selectedUser.role]}
            </span>
          </div>
          {persona && (
            <p className="text-xs text-slate-500 truncate">
              {persona.name} - {persona.allowedTools.length} 个工具可用
            </p>
          )}
        </div>
        <div className="text-xs text-slate-400 font-mono">Synapse</div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={clsx(
              'max-w-[85%] rounded-2xl px-4 py-2.5',
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-800',
            )}>
              {/* 工具执行卡片 */}
              {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {msg.toolExecutions.map((te, i) => (
                    <ToolCard key={i} execution={te} />
                  ))}
                </div>
              )}
              {/* 消息内容 */}
              <div className={clsx('prose-chat text-sm', msg.role === 'user' && 'text-white')}>
                <RenderMarkdown text={msg.content} />
              </div>
            </div>
          </div>
        ))}

        {/* 加载中 */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-1.5">
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
            </div>
          </div>
        )}

        {/* 快捷提示（仅首条消息后） */}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function ToolCard({ execution }: { execution: ToolExecution }) {
  const [expanded, setExpanded] = useState(false);
  const label = TOOL_LABELS[execution.tool] ?? execution.tool;

  return (
    <div className={clsx(
      'rounded-lg border text-xs',
      execution.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left"
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', execution.success ? 'bg-green-500' : 'bg-red-500')} />
        <span className="font-medium text-slate-700 flex-1">{label}</span>
        <svg className={clsx('w-3.5 h-3.5 text-slate-400 transition-transform', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-2.5 pb-2 space-y-1">
          <div>
            <span className="text-slate-500">输入:</span>
            <pre className="mt-0.5 bg-white rounded p-1.5 overflow-x-auto text-[11px] text-slate-700 border border-slate-100">
              {JSON.stringify(execution.input, null, 2)}
            </pre>
          </div>
          <div>
            <span className="text-slate-500">输出:</span>
            <pre className="mt-0.5 bg-white rounded p-1.5 overflow-x-auto text-[11px] text-slate-700 border border-slate-100 max-h-48">
              {formatOutput(execution.output)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function formatOutput(output: unknown): string {
  if (!output || typeof output !== 'object') return String(output);
  const data = output as { content?: Array<{ text?: string }> };
  if (data.content?.[0]?.text) {
    try { return JSON.stringify(JSON.parse(data.content[0].text), null, 2); } catch { return data.content[0].text; }
  }
  return JSON.stringify(output, null, 2);
}

function RenderMarkdown({ text }: { text: string }) {
  // 简易 markdown 渲染
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
