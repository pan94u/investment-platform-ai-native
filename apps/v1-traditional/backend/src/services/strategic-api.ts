/**
 * 战投系统代理 — 从战投平台拉取项目列表
 * 环境变量 STRATEGIC_API_ENABLED=false 可关闭（不可达时用 mock）
 */

interface StrategicProject {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly domain?: string;
  readonly industry?: string;
}

const API_BASE = 'https://hsip.haier.net/api';
const TIMEOUT = 5000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// 内存缓存
const cache = new Map<string, { data: StrategicProject[]; ts: number }>();

function isEnabled(): boolean {
  return process.env.STRATEGIC_API_ENABLED !== 'false';
}

async function fetchWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 投前项目列表 */
async function fetchPreInvestmentProjects(): Promise<StrategicProject[]> {
  try {
    const data = await fetchWithTimeout(`${API_BASE}/manageScreen/dealBaseTQ/findDealBaseTQList`) as { data?: Array<Record<string, string>> };
    return (data.data ?? []).map((item) => ({
      id: item.id ?? item.dealId ?? '',
      name: item.dealName ?? item.name ?? '',
      code: item.dealCode ?? '',
    }));
  } catch {
    return [];
  }
}

/** 投后项目列表 */
async function fetchPostInvestmentProjects(): Promise<StrategicProject[]> {
  try {
    const data = await fetchWithTimeout(`${API_BASE}/index/dealWfInvementIndex/afterList?pageNum=1&pageSize=1000`) as { data?: { list?: Array<Record<string, string>> } };
    return (data.data?.list ?? []).map((item) => ({
      id: item.id ?? '',
      name: item.dealName ?? item.name ?? '',
      code: item.dealCode ?? '',
    }));
  } catch {
    return [];
  }
}

/** 退出项目列表 */
async function fetchExitProjects(): Promise<StrategicProject[]> {
  try {
    const data = await fetchWithTimeout(`${API_BASE}/exit/dealExit/screenList?pageNum=1&pageSize=1000`) as { data?: { list?: Array<Record<string, string>> } };
    return (data.data?.list ?? []).map((item) => ({
      id: item.id ?? '',
      name: item.dealName ?? item.name ?? '',
      code: item.dealCode ?? '',
    }));
  } catch {
    return [];
  }
}

/** 基金列表 */
async function fetchFundProjects(): Promise<StrategicProject[]> {
  try {
    const data = await fetchWithTimeout(`${API_BASE}/manageScreen/fund/findFundInfo?onlyBaseData=true&pageNum=1&pageSize=1000`) as { data?: { list?: Array<Record<string, string>> } };
    return (data.data?.list ?? []).map((item) => ({
      id: item.id ?? '',
      name: item.fundName ?? item.name ?? '',
      code: item.fundCode ?? '',
    }));
  } catch {
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
 */
export async function fetchProjectList(filingType: string): Promise<StrategicProject[]> {
  if (!isEnabled()) return [];

  // 检查缓存
  const cached = cache.get(filingType);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  let projects: StrategicProject[];

  try {
    if (filingType === 'fund_investment') {
      projects = await fetchFundProjects();
    } else if (filingType === 'equity_direct' || filingType === 'fund_project' || filingType === 'other') {
      // 合并投前+投后+退出
      const [pre, post, exit] = await Promise.all([
        fetchPreInvestmentProjects(),
        fetchPostInvestmentProjects(),
        fetchExitProjects(),
      ]);
      projects = dedup([...pre, ...post, ...exit]);
    } else {
      projects = [];
    }
  } catch {
    projects = [];
  }

  // 更新缓存
  cache.set(filingType, { data: projects, ts: Date.now() });

  return projects;
}
