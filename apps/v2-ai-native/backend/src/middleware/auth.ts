import { createMiddleware } from 'hono/factory';
import { db } from '../lib/db.js';
import { users } from '@filing/database';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../lib/types.js';

/**
 * 简易认证中间件（PoC 用）
 * 通过 X-User-Id header 或 query param 识别用户
 * 生产环境应使用 JWT / SSO
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const userId = c.req.header('X-User-Id') ?? c.req.query('userId');

  if (!userId) {
    return c.json({ success: false, data: null, error: '未提供用户身份（需要 X-User-Id header）' }, 401);
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (result.length === 0) {
    return c.json({ success: false, data: null, error: '用户不存在' }, 401);
  }

  c.set('user', result[0] as any);
  await next();
});
