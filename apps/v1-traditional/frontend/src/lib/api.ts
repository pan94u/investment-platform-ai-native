import { iamService } from './iam-service'

const API_BASE = '/api'
const TOKEN_STORAGE_KEY = 'haier-user-center-access-token'

// --- 401 自动重登：队列去重 + 最大重试次数 ---

let isRefreshing = false
const failedQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = []

function processQueue(error?: unknown) {
  const pending = [...failedQueue]
  failedQueue.length = 0
  pending.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
}

const MAX_AUTH_RETRIES = 3

function getUserId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('userId') ?? ''
}

async function requestWithAuth<T>(
  path: string,
  options?: RequestInit & { _auth401RetryCount?: number },
): Promise<T> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getUserId(),
      ...(token ? { 'Access-Token': token } : {}),
      ...options?.headers,
    },
  })

  // 401 处理
  if (res.status === 401) {
    const retryCount = (options?._auth401RetryCount ?? 0) + 1
    if (retryCount > MAX_AUTH_RETRIES) {
      throw new Error('认证失败，已达最大重试次数')
    }

    if (isRefreshing) {
      // 并发 401：进入队列等待
      await new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
      return requestWithAuth(path, { ...options, _auth401RetryCount: retryCount })
    }

    isRefreshing = true
    try {
      const ok = await iamService.reLogin()
      if (!ok) {
        processQueue(new Error('重新登录失败'))
        throw new Error('重新登录失败')
      }
      processQueue()
      window.location.reload()
      // reload 后不再返回
      return new Promise(() => {})
    } catch (e) {
      processQueue(e)
      throw e
    } finally {
      isRefreshing = false
    }
  }

  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? '请求失败')
  return json.data
}

/** 用于上传文件的请求（不设 Content-Type，让浏览器自动加 boundary） */
async function requestUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'X-User-Id': getUserId(),
      ...(token ? { 'Access-Token': token } : {}),
    },
    body: formData,
  })

  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? '上传失败')
  return json.data
}

// --- 公共 API ---

export function getCurrentUser() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('currentUser')
  return raw ? JSON.parse(raw) : null
}

export function setCurrentUser(user: { id: string; username: string; name: string; role: string; department: string; domain: string } | null) {
  if (user) {
    localStorage.setItem('userId', user.id)
    localStorage.setItem('currentUser', JSON.stringify(user))
  } else {
    localStorage.removeItem('userId')
    localStorage.removeItem('currentUser')
  }
}

export const api = {
  getUsers: () => requestWithAuth<Array<{ id: string; username: string; name: string; role: string; department: string; domain: string }>>('/auth/users'),
  searchUsers: (keyword: string) =>
    requestWithAuth<Array<{ id: string; empCode: string; name: string; department: string; domain: string }>>(`/auth/users?keyword=${encodeURIComponent(keyword)}`),
  login: (username: string, password: string) =>
    requestWithAuth<{ token: string; user: { id: string; username: string; name: string; role: string; department: string; domain: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Filings
  getFilings: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return requestWithAuth<{ data: unknown[]; total: number; page: number; pageSize: number; totalPages: number }>(`/filings${qs}`)
  },
  getFiling: (id: string) => requestWithAuth<Record<string, unknown>>(`/filings/${id}`),
  createFiling: (data: Record<string, unknown>) =>
    requestWithAuth<Record<string, unknown>>('/filings', { method: 'POST', body: JSON.stringify(data) }),
  updateFiling: (id: string, data: Record<string, unknown>) =>
    requestWithAuth<Record<string, unknown>>(`/filings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  submitFiling: (id: string) =>
    requestWithAuth<Record<string, unknown>>(`/filings/${id}/submit`, { method: 'POST' }),
  recallFiling: (id: string) =>
    requestWithAuth<Record<string, unknown>>(`/filings/${id}/recall`, { method: 'POST' }),

  // Approvals
  getApprovalTodos: () => requestWithAuth<unknown[]>('/approvals/todos'),
  approveApproval: (id: string, comment?: string, emailOptions?: { skipEmail?: boolean; emailOverrides?: { to?: string[]; cc?: string[]; subject?: string } }) =>
    requestWithAuth<Record<string, unknown>>(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment, ...emailOptions }) }),
  rejectApproval: (id: string, comment?: string) =>
    requestWithAuth<Record<string, unknown>>(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) }),
  acknowledgeApproval: (id: string, comment?: string) =>
    requestWithAuth<Record<string, unknown>>(`/approvals/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({ comment }) }),
  getApprovalHistory: (filingId: string) => requestWithAuth<unknown[]>(`/approvals/history/${filingId}`),
  reassignApproval: (id: string, newApproverId: string, reason?: string) =>
    requestWithAuth<Record<string, unknown>>(`/approvals/${id}/reassign`, { method: 'PUT', body: JSON.stringify({ newApproverId, reason }) }),
  batchApproveApprovals: (approvalIds: string[], comment?: string) =>
    requestWithAuth<Record<string, unknown>>('/approvals/batch-approve', { method: 'POST', body: JSON.stringify({ approvalIds, comment }) }),

  // Approval chain preview
  getApprovalChainPreview: (params?: { domain?: string; filingType?: string; amount?: string; approvalGroups?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : ''
    return requestWithAuth<{
      business: Array<{ userId: string; name: string; level: number }>
      group: Array<{ userId: string; name: string; groupName: string }>
      confirmation: { userId: string; name: string }
    }>(`/filings/approval-chain-preview${qs}`)
  },

  // Email preview
  getEmailPreview: (filingId: string) =>
    requestWithAuth<{
      to: Array<{ email: string; name: string; userId?: string }>;
      cc: Array<{ email: string; name: string }>;
      subject: string;
      htmlBody: string;
      attachments: Array<{ filename: string; mimeType: string }>;
    }>(`/filings/${filingId}/email-preview`),

  // Org（领域/行业/员工）
  getOrgDomains: () => requestWithAuth<Array<{ code: string; name: string }>>('/org/domains'),
  getOrgIndustries: (fieldCode: string) => requestWithAuth<Array<{ code: string; name: string }>>(`/org/industries?fieldCode=${fieldCode}`),
  searchOrgEmployees: (keyword: string) => requestWithAuth<Array<{ empCode: string; empName: string; fieldName: string; ptName: string; xwName: string }>>(`/org/employees/search?keyword=${encodeURIComponent(keyword)}`),
  getAuthMe: () => requestWithAuth<{ id: string; empCode: string; name: string; role: string; department: string; domain: string; fieldCode: string; ptName: string }>('/auth/me'),

  // Dashboard
  getDashboardStats: () => requestWithAuth<Record<string, unknown>>('/dashboard/stats'),

  // Attachments
  uploadAttachment: (filingId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return requestUpload<Record<string, unknown>>(`/filings/${filingId}/attachments`, formData)
  },
  registerAttachment: (filingId: string, data: { filename: string; url: string; fileSize: number; mimeType: string }) =>
    requestWithAuth<Record<string, unknown>>(`/filings/${filingId}/attachments/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAttachments: (filingId: string) =>
    requestWithAuth<Array<{ id: string; filingId: string; filename: string; filePath: string; fileSize: number; mimeType: string; uploadedBy: string; uploaderName: string | null; createdAt: string }>>(`/filings/${filingId}/attachments`),
  downloadAttachment: async (id: string, filename: string, filePath?: string) => {
    // 远程 http URL 直接打开
    if (filePath?.startsWith('http')) {
      window.open(filePath, '_blank')
      return
    }
    // 走后端代理（本地文件 + remote:// 战投文件）
    // 必须用 fetch + blob，因为战投下载需要 Access-Token header（IAM token）换战投 token，
    // window.open 没法带 header
    const userId = getUserId()
    const token = typeof window !== 'undefined' ? localStorage.getItem('haier-user-center-access-token') : null
    const res = await fetch(`${API_BASE}/attachments/${id}/download?userId=${userId}`, {
      headers: {
        ...(token ? { 'Access-Token': token } : {}),
        'X-User-Id': userId,
      },
    })
    if (!res.ok) {
      let msg = `下载失败 ${res.status}`
      try {
        const json = await res.json() as { error?: string }
        if (json.error) msg = json.error
      } catch { /* ignore */ }
      alert(msg)
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
  deleteAttachment: (id: string) =>
    requestWithAuth<null>(`/attachments/${id}`, { method: 'DELETE' }),

  // Admin config
  getApprovalConfigs: () => requestWithAuth<Record<string, Array<Record<string, unknown>>>>('/admin/approval-configs'),
  addApprovalConfig: (data: { groupName: string; userId: string; userName: string; userEmail: string }) =>
    requestWithAuth<Record<string, unknown>>('/admin/approval-configs', { method: 'POST', body: JSON.stringify(data) }),
  removeApprovalConfig: (id: string) =>
    requestWithAuth<null>(`/admin/approval-configs/${id}`, { method: 'DELETE' }),
  getEmailCcConfigs: () => requestWithAuth<Record<string, Array<Record<string, unknown>>>>('/admin/email-cc-configs'),
  addEmailCcConfig: (data: { groupName: string; name: string; email: string }) =>
    requestWithAuth<Record<string, unknown>>('/admin/email-cc-configs', { method: 'POST', body: JSON.stringify(data) }),
  removeEmailCcConfig: (id: string) =>
    requestWithAuth<null>(`/admin/email-cc-configs/${id}`, { method: 'DELETE' }),

  // Strategic API
  getStrategicProjects: (filingType: string) =>
    requestWithAuth<Array<{ id: string; name: string; code: string }>>(`/strategic/projects?filingType=${filingType}`),

  // Mock
  getMockProjects: () => requestWithAuth<Array<{ id: string; name: string; domain: string; industry: string }>>('/mock/projects'),
  getMockLegalEntities: () => requestWithAuth<Array<{ id: string; name: string; projectId: string }>>('/mock/legal-entities'),
}
