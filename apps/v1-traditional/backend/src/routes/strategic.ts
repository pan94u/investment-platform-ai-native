import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { fetchProjectList } from '../services/strategic-api.js';

const strategicRouter = new Hono<AppEnv>();

strategicRouter.use('/*', authMiddleware);

/** GET /api/strategic/projects?filingType=xxx — 获取战投项目列表 */
strategicRouter.get('/projects', async (c) => {
  const filingType = c.req.query('filingType') ?? 'equity_direct';

  try {
    const projects = await fetchProjectList(filingType);
    return c.json({ success: true, data: projects, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取项目列表失败';
    return c.json({ success: true, data: [], error: message });
  }
});

export { strategicRouter };
