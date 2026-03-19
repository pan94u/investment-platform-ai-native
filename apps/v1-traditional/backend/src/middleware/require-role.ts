import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../lib/types.js';

/** 角色守卫中间件 — 仅允许指定角色访问 */
export function requireRole(...roles: string[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      return c.json({ success: false, data: null, error: '权限不足' }, 403);
    }
    await next();
  });
}
