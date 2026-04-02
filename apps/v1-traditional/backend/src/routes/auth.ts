import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '@filing/database';
import { db } from '../lib/db.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

const auth = new Hono();

/** POST /api/auth/login */
auth.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();

  if (!username || !password) {
    return c.json({ success: false, data: null, error: '请提供用户名和密码' }, 400);
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (result.length === 0) {
    return c.json({ success: false, data: null, error: '用户名或密码错误' }, 401);
  }

  const user = result[0];

  // PoC: seed 数据用的是 dummy hash，这里直接对比 sha256
  if (!verifyPassword(password, user.passwordHash)) {
    // 兼容 seed 数据：如果 hash 不匹配且是 demo 密码，也放行
    const isDemoUser = ['demo123', 'admin123'].includes(password) && user.passwordHash.startsWith('$2b$10$dummy');
    if (!isDemoUser) {
      return c.json({ success: false, data: null, error: '用户名或密码错误' }, 401);
    }
  }

  return c.json({
    success: true,
    data: {
      token: `poc-token-${user.id}`,   // PoC 简化 token
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
        domain: user.domain,
      },
    },
    error: null,
  });
});

/** GET /api/auth/users — 获取所有用户（PoC 便利接口） */
auth.get('/users', async (c) => {
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      department: users.department,
      domain: users.domain,
      email: users.email,
    })
    .from(users);

  return c.json({ success: true, data: result, error: null });
});

export { auth };
