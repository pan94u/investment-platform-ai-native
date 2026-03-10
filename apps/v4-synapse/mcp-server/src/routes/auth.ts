import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '@filing/database';
import { db } from '../lib/db.js';
import { createHash } from 'node:crypto';

const auth = new Hono();

/** 简易密码校验（PoC 用） */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

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

  if (!verifyPassword(password, user.passwordHash)) {
    const isDemoUser = ['demo123', 'admin123'].includes(password) && user.passwordHash.startsWith('$2b$10$dummy');
    if (!isDemoUser) {
      return c.json({ success: false, data: null, error: '用户名或密码错误' }, 401);
    }
  }

  return c.json({
    success: true,
    data: {
      token: `poc-token-${user.id}`,
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
    })
    .from(users);

  return c.json({ success: true, data: result, error: null });
});

export { auth };
