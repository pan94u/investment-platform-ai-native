import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { getDistinctDomains, getIndustriesByDomain, searchEmployees, getEmployeeByCode } from '../services/org-query.js';

const orgRouter = new Hono<AppEnv>();

orgRouter.use('/*', authMiddleware);

/** GET /api/org/domains — 领域（生态圈）列表 */
orgRouter.get('/domains', async (c) => {
  const domains = await getDistinctDomains();
  return c.json({ success: true, data: domains, error: null });
});

/** GET /api/org/industries?fieldCode=xxx — 行业（平台）列表 */
orgRouter.get('/industries', async (c) => {
  const fieldCode = c.req.query('fieldCode');
  if (!fieldCode) {
    return c.json({ success: false, data: null, error: '缺少 fieldCode 参数' }, 400);
  }
  const industries = await getIndustriesByDomain(fieldCode);
  return c.json({ success: true, data: industries, error: null });
});

/** GET /api/org/employees/search?keyword=xxx — 搜索员工 */
orgRouter.get('/employees/search', async (c) => {
  const keyword = c.req.query('keyword') ?? '';
  if (keyword.length < 2) {
    return c.json({ success: true, data: [], error: null });
  }
  const employees = await searchEmployees(keyword);
  return c.json({
    success: true,
    data: employees.map(e => ({
      empCode: e.empCode,
      empName: e.empName,
      fieldName: e.fieldName,
      ptName: e.ptName,
      xwName: e.xwName,
    })),
    error: null,
  });
});

/** GET /api/org/employee/:empCode — 查单个员工 */
orgRouter.get('/employee/:empCode', async (c) => {
  const emp = await getEmployeeByCode(c.req.param('empCode'));
  if (!emp) {
    return c.json({ success: false, data: null, error: '员工不存在' }, 404);
  }
  return c.json({ success: true, data: emp, error: null });
});

export { orgRouter };
