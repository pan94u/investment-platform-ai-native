import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { users } from '@filing/database';
import { db } from '../lib/db.js';

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string;
  domain: string;
};

type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

/**
 * 简易认证中间件（PoC 用）
 * 通过 X-User-Id header 或 query param 识别用户
 * 生产环境应使用 JWT / SSO
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const userId = c.req.header('X-User-Id') ?? c.req.query('userId');

  if (!userId) {
    return c.json({ success: false, data: null, error: '未提供用户身份' }, 401);
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (user.length === 0) {
    return c.json({ success: false, data: null, error: '用户不存在' }, 401);
  }

  const { passwordHash, createdAt, updatedAt, ...authUser } = user[0];
  c.set('user', authUser);
  await next();
});
