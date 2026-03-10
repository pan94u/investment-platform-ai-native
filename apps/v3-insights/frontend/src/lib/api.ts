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
  getDashboard: () => request<{
    overview: { totalFilings: number; totalAmount: number; pendingApprovals: number; avgApprovalHours: number };
    byType: Array<{ type: string; count: number; amount: number }>;
    byDomain: Array<{ domain: string; count: number; amount: number }>;
    byMonth: Array<{ month: string; count: number; amount: number }>;
    byStatus: Array<{ status: string; count: number }>;
  }>('/insights/dashboard'),

  // Insights - Trends
  getTrends: () => request<{
    monthly: Array<{ month: string; count: number; amount: number }>;
    typeShift: Array<{ type: string; trend: string; change: number }>;
  }>('/insights/trends'),

  // Insights - Anomalies
  getAnomalies: () => request<Array<{
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    relatedFilings: string[];
    detectedAt: string;
  }>>('/insights/anomalies'),

  // Insights - Warnings
  getWarnings: () => request<Array<{
    id: string;
    rule: string;
    severity: 'warning' | 'critical';
    message: string;
    details: string;
    filingIds: string[];
    createdAt: string;
  }>>('/insights/warnings'),

  // Insights - Project History
  getProjectHistory: (projectName: string) => request<{
    project: string;
    filings: Array<Record<string, unknown>>;
    timeline: Array<{ date: string; event: string; detail: string }>;
  }>(`/insights/project/${encodeURIComponent(projectName)}`),

  // Insights - AI Insights
  getInsights: () => request<Array<{
    id: string;
    type: 'trend' | 'anomaly' | 'warning' | 'recommendation';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    data?: Record<string, unknown>;
    createdAt: string;
  }>>('/insights'),

  // Insights - Query
  query: (question: string) =>
    request<{
      answer: string;
      confidence: number;
      records?: Array<Record<string, unknown>>;
      suggestions?: string[];
    }>('/insights/query', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

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
