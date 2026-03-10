const API_BASE = '/api';

function getUserId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userId') ?? '';
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('currentUser');
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(user: { id: string; username: string; name: string; role: string; department: string; domain: string } | null) {
  if (user) {
    localStorage.setItem('userId', user.id);
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUser');
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getUserId(),
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? '请求失败');
  return json.data;
}

// Auth
export const api = {
  getUsers: () => request<Array<{ id: string; username: string; name: string; role: string; department: string; domain: string }>>('/auth/users'),
  login: (username: string, password: string) =>
    request<{ token: string; user: { id: string; username: string; name: string; role: string; department: string; domain: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Filings
  getFilings: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[]; total: number; page: number; pageSize: number; totalPages: number }>(`/filings${qs}`);
  },
  getFiling: (id: string) => request<Record<string, unknown>>(`/filings/${id}`),

  // Approvals
  getApprovalTodos: () => request<unknown[]>('/approvals/todos'),
  approveApproval: (id: string, comment?: string) =>
    request<Record<string, unknown>>(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment }) }),
  rejectApproval: (id: string, comment?: string) =>
    request<Record<string, unknown>>(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) }),

  // Insights - Dashboard
  getDashboard: async () => {
    const raw = await request<{
      totalFilings: number;
      totalAmount: number;
      pendingCount: number;
      avgApprovalHours: number;
      byType: Record<string, number>;
      byDomain: Record<string, number>;
      byMonth: Array<{ month: string; count: number; amount: number }>;
      byStatus: Record<string, number>;
    }>('/insights/dashboard');
    // Transform backend flat structure to frontend expected shape
    return {
      overview: {
        totalFilings: raw.totalFilings,
        totalAmount: raw.totalAmount,
        pendingApprovals: raw.pendingCount,
        avgApprovalHours: Math.round(raw.avgApprovalHours * 10) / 10,
      },
      byType: Object.entries(raw.byType).map(([type, count]) => ({ type, count, amount: 0 })),
      byDomain: Object.entries(raw.byDomain).map(([domain, count]) => ({ domain, count, amount: 0 })),
      byMonth: raw.byMonth,
      byStatus: Object.entries(raw.byStatus).map(([status, count]) => ({ status, count })),
    };
  },

  // Insights - Trends
  getTrends: () => request<{
    monthly: Array<{ month: string; count: number; amount: number }>;
    typeShift: Array<{ type: string; trend: string; change: number }>;
  }>('/insights/trends'),

  // Insights - Anomalies
  getAnomalies: async () => {
    const raw = await request<{
      anomalies: Array<{
        id: string;
        type: string;
        severity: 'info' | 'warning' | 'critical';
        title: string;
        description: string;
        relatedFilings: string[];
        metric?: string;
        threshold?: number;
        actual?: number;
      }>;
    }>('/insights/anomalies');
    return raw.anomalies.map((a) => ({
      ...a,
      detectedAt: new Date().toISOString(),
    }));
  },

  // Insights - Warnings
  getWarnings: async () => {
    const raw = await request<Array<{
      id: string;
      rule: string;
      level: 'warning' | 'critical';
      message: string;
      details: Record<string, unknown> | string;
      triggeredAt: string;
    }>>('/insights/warnings');
    return raw.map((w) => ({
      id: w.id,
      rule: w.rule,
      severity: w.level,
      message: w.message,
      details: typeof w.details === 'string' ? w.details : JSON.stringify(w.details),
      filingIds: [] as string[],
      createdAt: w.triggeredAt,
    }));
  },

  // Insights - Project History
  getProjectHistory: (projectName: string) => request<{
    project: string;
    filings: Array<Record<string, unknown>>;
    timeline: Array<{ date: string; event: string; detail: string }>;
  }>(`/insights/project/${encodeURIComponent(projectName)}`),

  // Insights - AI Insights
  getInsights: async () => {
    const raw = await request<Array<{
      id: string;
      type: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      description: string;
      data?: Record<string, unknown>;
      generatedAt: string;
    }>>('/insights');
    return raw.map((i) => ({
      ...i,
      type: i.type as 'trend' | 'anomaly' | 'warning' | 'recommendation',
      createdAt: i.generatedAt,
    }));
  },

  // Insights - Query
  query: async (question: string) => {
    const raw = await request<{
      query: string;
      answer: string;
      confidence: number;
      data?: Array<Record<string, unknown>>;
      suggestions?: string[];
    }>('/insights/query', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
    return {
      answer: raw.answer,
      confidence: raw.confidence,
      records: raw.data,
      suggestions: raw.suggestions,
    };
  },

  // Reports
  getWeeklyReport: () => request<{
    period: string;
    summary: string;
    insights: string[];
    stats: Record<string, unknown>;
    generatedAt: string;
  }>('/insights/reports/weekly'),

  getMonthlyReport: () => request<{
    period: string;
    summary: string;
    insights: string[];
    stats: Record<string, unknown>;
    generatedAt: string;
  }>('/insights/reports/monthly'),
};
