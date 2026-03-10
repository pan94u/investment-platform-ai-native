import { Hono } from 'hono';

const mockRouter = new Hono();

/** Mock 战投系统 — 项目列表 */
mockRouter.get('/projects', (c) => {
  return c.json({
    success: true,
    data: [
      { id: 'proj-001', name: '海川项目', domain: 'smart_living', industry: '住居科技', status: 'active' },
      { id: 'proj-002', name: '星辰基金', domain: 'industrial_finance', industry: '金融投资', status: 'active' },
      { id: 'proj-003', name: '瑞丰项目', domain: 'industrial_finance', industry: '金融投资', status: 'active' },
      { id: 'proj-004', name: '康明项目', domain: 'health', industry: '医疗科技', status: 'active' },
      { id: 'proj-005', name: '创新科技项目', domain: 'smart_living', industry: '住居科技', status: 'active' },
    ],
    error: null,
  });
});

/** Mock 法务系统 — 法人实体列表 */
mockRouter.get('/legal-entities', (c) => {
  return c.json({
    success: true,
    data: [
      { id: 'le-001', name: '海川科技有限公司', projectId: 'proj-001', status: 'registered' },
      { id: 'le-002', name: '创新科技有限公司', projectId: 'proj-005', status: 'registered' },
      { id: 'le-003', name: '康明医疗科技有限公司', projectId: 'proj-004', status: 'registered' },
    ],
    error: null,
  });
});

/** Mock 飞书 — 发送通知（仅打日志） */
mockRouter.post('/feishu/notify', async (c) => {
  const body = await c.req.json();
  console.log('[Mock Feishu] 通知:', JSON.stringify(body, null, 2));
  return c.json({ success: true, data: { messageId: `mock-msg-${Date.now()}` }, error: null });
});

export { mockRouter };
