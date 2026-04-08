/**
 * 战投系统认证 — 共享 token 换取
 * 流程: IAM token → GET ${STRATEGIC_API_BASE}/haier/auth/checkUser?accessToken=<IAM> → 战投 token
 *
 * strategic-api.ts (项目列表) 和 attachment.ts (附件上传) 共享同一份 token 缓存。
 */

const API_BASE = process.env.STRATEGIC_API_BASE ?? 'https://hsip.haier.net/api';
const TIMEOUT = 8000;
const TOKEN_TTL = 25 * 60 * 1000; // 25 minutes

let tokenCache: { token: string; ts: number; key: string } | null = null;

export function getStrategicApiBase(): string {
  return API_BASE;
}

/** 用 IAM token 换取战投系统 token */
export async function getStrategicToken(iamToken: string): Promise<string> {
  if (!iamToken) throw new Error('缺少 IAM token');

  const cacheKey = iamToken.slice(0, 16);
  if (tokenCache && tokenCache.key === cacheKey && Date.now() - tokenCache.ts < TOKEN_TTL) {
    return tokenCache.token;
  }

  const url = `${API_BASE}/haier/auth/checkUser?accessToken=${encodeURIComponent(iamToken)}`;
  console.log('[Strategic] 换取 token:', url.replace(iamToken, '***'));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`checkUser HTTP ${res.status}`);
    const json = await res.json() as Record<string, unknown>;
    console.log('[Strategic] checkUser 响应:', JSON.stringify(json).slice(0, 300));

    // 兼容多种返回格式: data / datas / result
    const data = (json.data ?? json.datas ?? json.result ?? json) as Record<string, unknown>;
    const token = (data.token ?? data.accessToken ?? data.access_token ?? json.token ?? '') as string;
    if (!token) {
      console.error('[Strategic] checkUser 无法提取 token，完整响应:', JSON.stringify(json));
      throw new Error('checkUser 未返回 token');
    }

    tokenCache = { token, ts: Date.now(), key: cacheKey };
    return token;
  } finally {
    clearTimeout(timer);
  }
}
