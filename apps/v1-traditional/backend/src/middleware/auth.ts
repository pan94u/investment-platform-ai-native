import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { userRoles } from '@filing/database';
import { db } from '../lib/db.js';
import { getEmployeeByCode } from '../services/org-query.js';

export type AuthUser = {
  id: string;          // emp_code
  empCode: string;
  name: string;
  role: string;        // initiator | admin | viewer
  department: string;  // xw_name
  domain: string;      // field_name（生态圈）
  fieldCode: string;   // field_code
  ptName: string;      // pt_name（平台）
  email: string;       // ent_email（可能加密）
};

type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

/**
 * 认证中间件
 * 线上：网关解析 token 后将工号放入 user-account header
 * 开发：默认 DEV_USER_ACCOUNT 环境变量或 20111223
 * 兼容：保留 X-User-Id header 作为降级（PoC seed 数据）
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  // 1. 取工号：user-account > X-User-Id > query param > 开发默认值
  let empCode = c.req.header('user-account')
    ?? c.req.header('X-User-Id')
    ?? c.req.query('userId')
    ?? null;

  // 开发环境默认值
  if (!empCode && process.env.NODE_ENV !== 'production') {
    empCode = process.env.DEV_USER_ACCOUNT ?? '20111223';
  }

  if (!empCode) {
    return c.json({ success: false, data: null, error: '未提供用户身份' }, 401);
  }

  // 兼容 PoC 的 user-xxx 格式 ID → 提取名字用于降级
  const isPocId = empCode.startsWith('user-');

  // 2. 查 org 表获取员工信息
  const emp = await getEmployeeByCode(isPocId ? '' : empCode);

  // 3. 查角色（user_roles 表），不存在则默认 initiator
  let role = 'initiator';
  try {
    const roleRows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.empCode, empCode))
      .limit(1);
    if (roleRows.length > 0) {
      role = roleRows[0].role;
    }
  } catch {
    // user_roles 表可能还不存在，忽略
  }

  if (emp) {
    // 正常路径：从 org 表获取信息
    c.set('user', {
      id: emp.empCode,
      empCode: emp.empCode,
      name: emp.empName,
      role,
      department: emp.xwName || emp.ptName,
      domain: emp.fieldName,
      fieldCode: emp.fieldCode,
      ptName: emp.ptName,
      email: emp.entEmail,
    });
  } else if (isPocId) {
    // 降级路径：PoC 用户 ID（兼容前端 localStorage 里的旧数据）
    const pocNames: Record<string, { name: string; dept: string; domain: string; role: string }> = {
      'user-zhangsan': { name: '张三', dept: '智慧住居事业部', domain: '智慧住居', role: 'initiator' },
      'user-lisi': { name: '李四', dept: '智慧住居事业部', domain: '智慧住居', role: 'initiator' },
      'user-wangwu': { name: '王五', dept: '集团战略投资部', domain: '集团战略', role: 'initiator' },
      'user-admin': { name: '曹智', dept: '集团战略投资部', domain: '集团战略', role: 'admin' },
      'user-ceo': { name: '陈总', dept: '集团管理层', domain: '集团管理', role: 'viewer' },
    };
    const poc = pocNames[empCode];
    if (!poc) {
      return c.json({ success: false, data: null, error: '用户不存在' }, 401);
    }
    c.set('user', {
      id: empCode,
      empCode,
      name: poc.name,
      role: poc.role,
      department: poc.dept,
      domain: poc.domain,
      fieldCode: '',
      ptName: '',
      email: '',
    });
  } else {
    // emp_code 在 org 表中不存在
    c.set('user', {
      id: empCode,
      empCode,
      name: empCode,
      role,
      department: '',
      domain: '',
      fieldCode: '',
      ptName: '',
      email: '',
    });
  }

  await next();
});
