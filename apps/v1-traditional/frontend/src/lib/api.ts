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
  createFiling: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/filings', { method: 'POST', body: JSON.stringify(data) }),
  updateFiling: (id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/filings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  submitFiling: (id: string) =>
    request<Record<string, unknown>>(`/filings/${id}/submit`, { method: 'POST' }),
  recallFiling: (id: string) =>
    request<Record<string, unknown>>(`/filings/${id}/recall`, { method: 'POST' }),

  // Approvals
  getApprovalTodos: () => request<unknown[]>('/approvals/todos'),
  approveApproval: (id: string, comment?: string) =>
    request<Record<string, unknown>>(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment }) }),
  rejectApproval: (id: string, comment?: string) =>
    request<Record<string, unknown>>(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) }),
  getApprovalHistory: (filingId: string) => request<unknown[]>(`/approvals/history/${filingId}`),
  reassignApproval: (id: string, newApproverId: string, reason?: string) =>
    request<Record<string, unknown>>(`/approvals/${id}/reassign`, { method: 'PUT', body: JSON.stringify({ newApproverId, reason }) }),
  batchApproveApprovals: (approvalIds: string[], comment?: string) =>
    request<Record<string, unknown>>('/approvals/batch-approve', { method: 'POST', body: JSON.stringify({ approvalIds, comment }) }),

  // Approval chain preview
  getApprovalChainPreview: (params?: { domain?: string; filingType?: string; amount?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return request<Array<{ userId: string; name: string; level: number }>>(`/filings/approval-chain-preview${qs}`);
  },

  // Dashboard
  getDashboardStats: () => request<Record<string, unknown>>('/dashboard/stats'),

  // Mock
  getMockProjects: () => request<Array<{ id: string; name: string; domain: string; industry: string }>>('/mock/projects'),
  getMockLegalEntities: () => request<Array<{ id: string; name: string; projectId: string }>>('/mock/legal-entities'),
};
