export type UserInfo = Record<string, unknown>

type LoginResponse =
  | { success: true; token?: string; userInfo?: UserInfo; errorMessage?: string }
  | { success: false; errorMessage?: string }

const TOKEN_STORAGE_KEY = 'haier-user-center-access-token'

async function getIam() {
  return await import('@haier/iam')
}

export class IAMService {
  private static instance: IAMService
  private initialized = false

  static getInstance(): IAMService {
    if (!IAMService.instance) {
      IAMService.instance = new IAMService()
    }
    return IAMService.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    const { configUserCenter } = await getIam()

    await configUserCenter({
      ssoUrl: process.env.NEXT_PUBLIC_SSO_URL!,
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
      tokenUrl: process.env.NEXT_PUBLIC_TOKEN_URL!,
      appId: process.env.NEXT_PUBLIC_APP_ID,
      exitUrl: window.location.origin,
      tokenStorageKey: TOKEN_STORAGE_KEY,
      userInfoStorageKey: 'haier-user-center-user-info',
      extra: {
        debugLog: process.env.NODE_ENV === 'development',
        locationParseEnableHash: false,
        isOversea: false,
      },
    })

    this.initialized = true
  }

  async login(force: boolean = true): Promise<
    | { success: true; token: string; userInfo: UserInfo }
    | { success: false; error: string }
  > {
    try {
      const { login } = await getIam()
      const result = await login({ force, invalidateToken: false }) as LoginResponse
      if (!result.success) {
        return { success: false, error: result.errorMessage || '登录失败' }
      }
      return { success: true, token: result.token!, userInfo: result.userInfo! }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '登录异常' }
    }
  }

  async reLogin(): Promise<boolean> {
    try {
      const { login } = await getIam()
      const result = await login({ force: true, invalidateToken: true }) as LoginResponse
      return !!result.success
    } catch {
      return false
    }
  }

  async logout(): Promise<boolean> {
    try {
      const { logout } = await getIam()
      return !!(await logout())
    } catch {
      return false
    }
  }

  async getCurrentUser(): Promise<UserInfo | undefined> {
    const { requestUserInfoAndUpdate } = await getIam()
    return await requestUserInfoAndUpdate() as UserInfo | undefined
  }

  async isAuthenticated(): Promise<boolean> {
    const { getConfig } = await getIam()
    const config = getConfig()
    return !!localStorage.getItem(config?.tokenStorageKey || TOKEN_STORAGE_KEY)
  }
}

export const iamService = IAMService.getInstance()
