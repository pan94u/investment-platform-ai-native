'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { iamService } from '@/lib/iam-service'
import { api, getCurrentUser, setCurrentUser } from '@/lib/api'

export function IAMProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        // 1. 初始化 IAM SDK
        await iamService.initialize()

        // 2. 检查是否已登录（本地有 token）
        const isAuthenticated = await iamService.isAuthenticated()
        if (!isAuthenticated) {
          const loginResult = await iamService.login()
          if (!loginResult.success) {
            setError(`登录失败: ${loginResult.error}`)
            return
          }
        }

        // 3. 清除 URL 上的 OAuth 回调参数
        const url = new URL(window.location.href)
        if (url.searchParams.has('code') || url.searchParams.has('state')) {
          url.searchParams.delete('code')
          url.searchParams.delete('state')
          url.searchParams.delete('language')
          window.history.replaceState({}, '', url.pathname + url.search)
        }

        // 4. 如果 currentUser 已存在（本次会话已初始化过），直接进入
        if (getCurrentUser()) {
          setReady(true)
          return
        }

        // 5. 从 IAM 获取用户信息，提取工号（emp_code）
        const iamUser = await iamService.getCurrentUser()
        const empCode = (
          iamUser?.empCode ??
          iamUser?.account ??
          iamUser?.userCode ??
          iamUser?.sub
        ) as string | undefined

        if (empCode) {
          // 存入 localStorage，让 requestWithAuth 能带上 X-User-Id
          localStorage.setItem('userId', empCode)
        }

        // 6. 调用后端 /api/auth/me 获取完整档案（org 表 + user_roles 表）
        try {
          const profile = await api.getAuthMe()
          setCurrentUser({
            id: profile.empCode,
            username: profile.empCode,
            name: profile.name,
            role: profile.role,
            department: profile.department,
            domain: profile.domain,
          })
        } catch {
          // org 表不可达时降级：用 IAM 返回的基本信息
          if (empCode) {
            setCurrentUser({
              id: empCode,
              username: empCode,
              name: (iamUser?.name ?? iamUser?.userName ?? empCode) as string,
              role: 'initiator',
              department: (iamUser?.deptName ?? '') as string,
              domain: '',
            })
          }
        }

        setReady(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : '账号中心初始化失败')
      }
    }

    init()
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg font-medium">认证失败</p>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-[#0066CC] text-white rounded hover:bg-[#0055AA]"
            onClick={() => window.location.reload()}
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#0066CC]" />
          <p className="text-sm text-gray-400">正在验证身份…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
