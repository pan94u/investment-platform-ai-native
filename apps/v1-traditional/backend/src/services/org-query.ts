import mysql from 'mysql2/promise';

/**
 * 组织数据查询服务
 * 数据源：MySQL jbs_haier2.td_hrp2001_emp_org（只读）
 */

export interface Employee {
  empCode: string;
  empName: string;
  entEmail: string;        // 可能是加密值
  fieldCode: string;       // 生态圈代码 → 领域
  fieldName: string;       // 生态圈名称 → 领域
  ptCode: string;          // 平台代码 → 行业
  ptName: string;          // 平台名称 → 行业
  xwName: string;          // 小微名称 → 部门
  threeTypePerson: string; // 创客/小微主/平台主
  line1ManagerCode: string;
  line1ManagerName: string;
}

export interface DomainItem {
  code: string;
  name: string;
}

// ─── 连接池 ──────────────────────────────────────────

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;

  const host = process.env.ORG_DB_HOST ?? '10.250.12.15';
  const port = Number(process.env.ORG_DB_PORT ?? 3100);
  const user = process.env.ORG_DB_USER ?? 'jbs_test';
  const password = process.env.ORG_DB_PASS ?? 'l#1yCNYn8Qex';
  const database = process.env.ORG_DB_NAME ?? 'jbs_haier2';

  pool = mysql.createPool({
    host, port, user, password, database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 5000,
  });

  return pool;
}

// ─── 缓存 ──────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000; // 10 分钟
const cache = new Map<string, { data: unknown; ts: number }>();

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Promise.resolve(hit.data as T);
  return fn().then((data) => { cache.set(key, { data, ts: Date.now() }); return data; });
}

// ─── 查询方法 ──────────────────────────────────────

/** 按工号查员工信息 */
export async function getEmployeeByCode(empCode: string): Promise<Employee | null> {
  return cached(`emp:${empCode}`, async () => {
    try {
      const [rows] = await getPool().execute(
        `SELECT emp_code, emp_name, ent_email, field_code, field_name, pt_code, pt_name, xw_name, three_type_person, line1_manager_code, line1_manager_name
         FROM td_hrp2001_emp_org WHERE emp_code = ? LIMIT 1`,
        [empCode],
      );
      const list = rows as Record<string, string>[];
      if (list.length === 0) return null;
      const r = list[0];
      return {
        empCode: r.emp_code,
        empName: r.emp_name,
        entEmail: r.ent_email ?? '',
        fieldCode: r.field_code ?? '',
        fieldName: r.field_name ?? '',
        ptCode: r.pt_code ?? '',
        ptName: r.pt_name ?? '',
        xwName: r.xw_name ?? '',
        threeTypePerson: r.three_type_person ?? '',
        line1ManagerCode: r.line1_manager_code ?? '',
        line1ManagerName: r.line1_manager_name ?? '',
      };
    } catch (err) {
      console.error(`[OrgQuery] getEmployeeByCode(${empCode}) failed:`, err);
      return null;
    }
  });
}

/** 批量查员工（用于解析审批人姓名） */
export async function getEmployeesByCode(empCodes: string[]): Promise<Map<string, Employee>> {
  const result = new Map<string, Employee>();
  if (empCodes.length === 0) return result;

  // 先查缓存
  const uncached: string[] = [];
  for (const code of empCodes) {
    const hit = cache.get(`emp:${code}`);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      if (hit.data) result.set(code, hit.data as Employee);
    } else {
      uncached.push(code);
    }
  }

  if (uncached.length > 0) {
    try {
      const placeholders = uncached.map(() => '?').join(',');
      const [rows] = await getPool().execute(
        `SELECT emp_code, emp_name, ent_email, field_code, field_name, pt_code, pt_name, xw_name, three_type_person, line1_manager_code, line1_manager_name
         FROM td_hrp2001_emp_org WHERE emp_code IN (${placeholders})`,
        uncached,
      );
      for (const r of rows as Record<string, string>[]) {
        const emp: Employee = {
          empCode: r.emp_code,
          empName: r.emp_name,
          entEmail: r.ent_email ?? '',
          fieldCode: r.field_code ?? '',
          fieldName: r.field_name ?? '',
          ptCode: r.pt_code ?? '',
          ptName: r.pt_name ?? '',
          xwName: r.xw_name ?? '',
          threeTypePerson: r.three_type_person ?? '',
          line1ManagerCode: r.line1_manager_code ?? '',
          line1ManagerName: r.line1_manager_name ?? '',
        };
        result.set(emp.empCode, emp);
        cache.set(`emp:${emp.empCode}`, { data: emp, ts: Date.now() });
      }
    } catch (err) {
      console.error(`[OrgQuery] getEmployeesByCode failed:`, err);
    }
  }

  return result;
}

/**
 * 获取经理链（逐级上溯 line1_manager_code）
 * 返回从直接上级到最高级的有序数组
 * 终止条件：line1_manager_code 为空、自己指向自己、three_type_person=平台主、达到 maxDepth
 */
export async function getManagerChain(empCode: string, maxDepth = 5): Promise<Employee[]> {
  const chain: Employee[] = [];
  const seen = new Set<string>();
  let currentCode = empCode;

  for (let i = 0; i < maxDepth; i++) {
    const emp = await getEmployeeByCode(currentCode);
    if (!emp || !emp.line1ManagerCode || emp.line1ManagerCode === currentCode) break;

    const manager = await getEmployeeByCode(emp.line1ManagerCode);
    if (!manager || seen.has(manager.empCode)) break;

    seen.add(manager.empCode);
    chain.push(manager);

    // 平台主是终点
    if (manager.threeTypePerson === '平台主') break;

    currentCode = manager.empCode;
  }

  return chain;
}

/** 获取所有领域（生态圈）列表 */
export async function getDistinctDomains(): Promise<DomainItem[]> {
  return cached('domains', async () => {
    try {
      const [rows] = await getPool().execute(
        `SELECT DISTINCT field_code, field_name FROM td_hrp2001_emp_org
         WHERE field_name IS NOT NULL AND field_name != '' ORDER BY field_name`,
      );
      return (rows as Record<string, string>[])
        .filter(r => r.field_code && r.field_name)
        .map(r => ({ code: r.field_code, name: r.field_name }));
    } catch (err) {
      console.error('[OrgQuery] getDistinctDomains failed:', err);
      return [];
    }
  });
}

/** 获取指定领域下的行业（平台）列表 */
export async function getIndustriesByDomain(fieldCode: string): Promise<DomainItem[]> {
  return cached(`industries:${fieldCode}`, async () => {
    try {
      const [rows] = await getPool().execute(
        `SELECT DISTINCT pt_code, pt_name FROM td_hrp2001_emp_org
         WHERE field_code = ? AND pt_name IS NOT NULL AND pt_name != '' ORDER BY pt_name`,
        [fieldCode],
      );
      return (rows as Record<string, string>[])
        .filter(r => r.pt_code && r.pt_name)
        .map(r => ({ code: r.pt_code, name: r.pt_name }));
    } catch (err) {
      console.error(`[OrgQuery] getIndustriesByDomain(${fieldCode}) failed:`, err);
      return [];
    }
  });
}

/** 搜索员工（用于收件人选择等） */
export async function searchEmployees(keyword: string, limit = 20): Promise<Employee[]> {
  if (!keyword || keyword.length < 2) return [];
  try {
    const [rows] = await getPool().execute(
      `SELECT emp_code, emp_name, ent_email, field_code, field_name, pt_code, pt_name, xw_name, three_type_person, line1_manager_code, line1_manager_name
       FROM td_hrp2001_emp_org
       WHERE emp_name LIKE ? OR emp_code LIKE ?
       LIMIT ?`,
      [`%${keyword}%`, `%${keyword}%`, limit],
    );
    return (rows as Record<string, string>[]).map(r => ({
      empCode: r.emp_code,
      empName: r.emp_name,
      entEmail: r.ent_email ?? '',
      fieldCode: r.field_code ?? '',
      fieldName: r.field_name ?? '',
      ptCode: r.pt_code ?? '',
      ptName: r.pt_name ?? '',
      xwName: r.xw_name ?? '',
      threeTypePerson: r.three_type_person ?? '',
      line1ManagerCode: r.line1_manager_code ?? '',
      line1ManagerName: r.line1_manager_name ?? '',
    }));
  } catch (err) {
    console.error(`[OrgQuery] searchEmployees(${keyword}) failed:`, err);
    return [];
  }
}
