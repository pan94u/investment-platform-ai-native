/**
 * 战投系统代理 — 从战投平台拉取项目列表
 * 认证流程: IAM token → GET /api/haier/auth/checkUser?accessToken=<IAM> → 拿到战投 token
 * 环境变量 STRATEGIC_API_ENABLED=false 可关闭（不可达时用 mock）
 */

interface StrategicProject {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly domain?: string;
  readonly industry?: string;
}

const API_BASE = process.env.STRATEGIC_API_BASE ?? 'https://hsip.haier.net/api';
const TIMEOUT = 8000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TOKEN_TTL = 25 * 60 * 1000; // 25 minutes

// 项目列表缓存
const cache = new Map<string, { data: StrategicProject[]; ts: number }>();

// 战投 token 缓存（按 IAM token 前 16 字符做 key）
let tokenCache: { token: string; ts: number; key: string } | null = null;

function isEnabled(): boolean {
  return process.env.STRATEGIC_API_ENABLED !== 'false';
}

/** 用 IAM token 换取战投系统 token */
async function getStrategicToken(iamToken: string): Promise<string> {
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

async function fetchWithAuth(url: string, authToken: string, method: 'GET' | 'POST' = 'GET'): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
  let body: string | undefined;
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    body = '{}';
  }

  try {
    const res = await fetch(url, { method, signal: controller.signal, headers, body });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 投前项目列表（POST，无参数） */
async function fetchPreInvestmentProjects(token: string): Promise<StrategicProject[]> {
  const url = `${API_BASE}/manageScreen/dealBaseTQ/findDealBaseTQList`;
  try {
    const raw = await fetchWithAuth(url, token, 'POST');
    console.log('[Strategic] 投前响应:', JSON.stringify(raw).slice(0, 300));
    const data = raw as { rows?: Array<Record<string, string>>; data?: Array<Record<string, string>> };
    const list = data.rows ?? data.data ?? [];
    console.log('[Strategic] 投前项目数:', list.length, '首条字段:', list[0] ? Object.keys(list[0]).join(',') : 'N/A');
    return list.map((item) => ({
      id: item.id ?? item.dealId ?? '',
      name: item.dealName ?? item.name ?? '',
      code: item.dealCode ?? '',
    }));
  } catch (e) {
    console.error('[Strategic] 投前请求失败:', url, e instanceof Error ? e.message : e);
    return [];
  }
}

/** 投后项目列表 */
async function fetchPostInvestmentProjects(token: string): Promise<StrategicProject[]> {
  const url = `${API_BASE}/index/dealWfInvementIndex/afterList?pageNum=1&pageSize=1000`;
  try {
    const raw = await fetchWithAuth(url, token);
    console.log('[Strategic] 投后响应:', JSON.stringify(raw).slice(0, 300));
    const data = raw as { rows?: Array<Record<string, string>>; data?: { list?: Array<Record<string, string>> } };
    const list = data.rows ?? data.data?.list ?? [];
    console.log('[Strategic] 投后项目数:', list.length, '首条字段:', list[0] ? Object.keys(list[0]).join(',') : 'N/A');
    return list.map((item) => ({
      id: item.id ?? '',
      name: item.dealName ?? item.name ?? '',
      code: item.dealCode ?? '',
    }));
  } catch (e) {
    console.error('[Strategic] 投后请求失败:', url, e instanceof Error ? e.message : e);
    return [];
  }
}

/** 退出项目列表 */
async function fetchExitProjects(token: string): Promise<StrategicProject[]> {
  const url = `${API_BASE}/exit/dealExit/screenList?pageNum=1&pageSize=1000`;
  try {
    const raw = await fetchWithAuth(url, token);
    console.log('[Strategic] 退出响应:', JSON.stringify(raw).slice(0, 300));
    const data = raw as { rows?: Array<Record<string, string>>; data?: { list?: Array<Record<string, string>> } };
    const list = data.rows ?? data.data?.list ?? [];
    console.log('[Strategic] 退出项目数:', list.length, '首条字段:', list[0] ? Object.keys(list[0]).join(',') : 'N/A');
    return list.map((item) => ({
      id: item.id ?? '',
      name: item.dealName ?? item.name ?? '',
      code: item.dealCode ?? '',
    }));
  } catch (e) {
    console.error('[Strategic] 退出请求失败:', url, e instanceof Error ? e.message : e);
    return [];
  }
}

/** 基金列表 */
async function fetchFundProjects(token: string): Promise<StrategicProject[]> {
  const url = `${API_BASE}/manageScreen/fund/findFundInfo?onlyBaseData=true&pageNum=1&pageSize=1000`;
  try {
    const raw = await fetchWithAuth(url, token);
    console.log('[Strategic] 基金响应:', JSON.stringify(raw).slice(0, 300));
    const data = raw as { rows?: Array<Record<string, string>>; data?: { list?: Array<Record<string, string>> } };
    const list = data.rows ?? data.data?.list ?? [];
    console.log('[Strategic] 基金项目数:', list.length, '首条字段:', list[0] ? Object.keys(list[0]).join(',') : 'N/A');
    return list.map((item) => ({
      id: item.id ?? '',
      name: item.fundName ?? item.name ?? '',
      code: item.fundCode ?? '',
    }));
  } catch (e) {
    console.error('[Strategic] 基金请求失败:', url, e instanceof Error ? e.message : e);
    return [];
  }
}

/** 去重合并 */
function dedup(projects: StrategicProject[]): StrategicProject[] {
  const seen = new Set<string>();
  return projects.filter((p) => {
    const key = p.name || p.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 按备案类型获取项目列表
 * @param iamToken IAM SDK 的 access token，用于换取战投系统 token
 */
export async function fetchProjectList(filingType: string, iamToken: string): Promise<StrategicProject[]> {
  if (!isEnabled()) return [];
  if (!iamToken) throw new Error('缺少 IAM token');

  // 检查缓存
  const cached = cache.get(filingType);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  // 换取战投 token
  const token = await getStrategicToken(iamToken);

  let projects: StrategicProject[];

  try {
    if (filingType === 'fund_investment') {
      projects = await fetchFundProjects(token);
    } else if (filingType === 'equity_direct' || filingType === 'fund_project' || filingType === 'other') {
      const [pre, post, exit] = await Promise.all([
        fetchPreInvestmentProjects(token),
        fetchPostInvestmentProjects(token),
        fetchExitProjects(token),
      ]);
      projects = dedup([...pre, ...post, ...exit]);
    } else {
      projects = [];
    }
  } catch {
    projects = [];
  }

  cache.set(filingType, { data: projects, ts: Date.now() });

  return projects;
}
