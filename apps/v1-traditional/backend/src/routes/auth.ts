import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { userRoles } from '@filing/database';
import { db } from '../lib/db.js';
import { getEmployeeByCode, searchEmployees } from '../services/org-query.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

const auth = new Hono<AppEnv>();

/** GET /api/auth/me — 获取当前用户信息（从 org 表 + user_roles） */
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({
    success: true,
    data: {
      id: user.id,
      empCode: user.empCode,
      name: user.name,
      role: user.role,
      department: user.department,
      domain: user.domain,
      fieldCode: user.fieldCode,
      ptName: user.ptName,
    },
    error: null,
  });
});

/** GET /api/auth/users — 搜索用户（从 org 表） */
auth.get('/users', async (c) => {
  const keyword = c.req.query('keyword') ?? '';

  if (keyword.length >= 2) {
    const emps = await searchEmployees(keyword, 30);
    const result = emps.map(e => ({
      id: e.empCode,
      empCode: e.empCode,
      name: e.empName,
      department: e.xwName || e.ptName,
      domain: e.fieldName,
      email: e.entEmail,
    }));
    return c.json({ success: true, data: result, error: null });
  }

  // 无关键词：返回空列表（前端通过搜索添加收件人）
  return c.json({ success: true, data: [], error: null });
});

/** POST /api/auth/login — PoC 兼容登录接口 */
auth.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();

  if (!username) {
    return c.json({ success: false, data: null, error: '请提供用户名' }, 400);
  }

  // 先尝试用 emp_code 查 org 表
  const emp = await getEmployeeByCode(username);
  if (emp) {
    return c.json({
      success: true,
      data: {
        token: `poc-token-${emp.empCode}`,
        user: {
          id: emp.empCode,
          empCode: emp.empCode,
          username: emp.empCode,
          name: emp.empName,
          role: 'initiator',
          department: emp.xwName || emp.ptName,
          domain: emp.fieldName,
        },
      },
      error: null,
    });
  }

  // 降级：PoC 用户
  const pocMap: Record<string, { id: string; name: string; role: string; dept: string; domain: string }> = {
    zhangsan: { id: 'user-zhangsan', name: '张三', role: 'initiator', dept: '智慧住居事业部', domain: '智慧住居' },
    lisi: { id: 'user-lisi', name: '李四', role: 'supervisor', dept: '智慧住居事业部', domain: '智慧住居' },
    wangwu: { id: 'user-wangwu', name: '王五', role: 'group_approver', dept: '集团战略投资部', domain: '集团战略' },
    admin: { id: 'user-admin', name: '曹智', role: 'admin', dept: '集团战略投资部', domain: '集团战略' },
    ceo: { id: 'user-ceo', name: '陈总', role: 'viewer', dept: '集团管理层', domain: '集团管理' },
  };

  const poc = pocMap[username];
  if (poc && ['demo123', 'admin123'].includes(password)) {
    return c.json({
      success: true,
      data: {
        token: `poc-token-${poc.id}`,
        user: { id: poc.id, username, name: poc.name, role: poc.role, department: poc.dept, domain: poc.domain },
      },
      error: null,
    });
  }

  return c.json({ success: false, data: null, error: '用户名或密码错误' }, 401);
});

export { auth };
