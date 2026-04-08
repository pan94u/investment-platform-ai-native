import { Hono } from 'hono';
import { getNotifyProvider } from '../providers/index.js';
import type { TodoPayload } from '../providers/types.js';

/**
 * 开发期飞书测试 endpoint —— 不挂载到生产
 *
 * 用法:
 *   POST /api/_dev/feishu-card?empCode=20111223
 *   {
 *     "filingTitle": "测试备案",
 *     "filingNumber": "TEST-2026-001",
 *     "amount": "1000",
 *     ...其他字段可选
 *   }
 *
 * 默认 dry_run 模式只 console.log，不真发到飞书。
 */
const devFeishuRouter = new Hono();

devFeishuRouter.post('/feishu-card', async (c) => {
  const empCode = c.req.query('empCode');
  if (!empCode) {
    return c.json({ success: false, error: '缺少 empCode query 参数' }, 400);
  }

  let body: Partial<TodoPayload> = {};
  try {
    body = await c.req.json<Partial<TodoPayload>>();
  } catch {
    /* body 可选 */
  }

  const payload: TodoPayload = {
    approvalId: body.approvalId ?? `test-${Date.now()}`,
    filingId: body.filingId ?? `filing-test-${Date.now()}`,
    filingNumber: body.filingNumber ?? 'TEST-2026-001',
    filingTitle: body.filingTitle ?? '飞书卡片测试备案',
    approverUserId: empCode,
    approverName: body.approverName ?? empCode,
    stage: body.stage ?? 'business',
    level: body.level ?? 1,
    groupName: body.groupName,
    creatorName: body.creatorName ?? '测试发起人',
    amount: body.amount ?? '1000',
    filingType: body.filingType ?? 'equity_direct',
  };

  console.log('[DEV] 触发飞书卡片测试 payload:', JSON.stringify(payload));

  try {
    const messageId = await getNotifyProvider().pushTodo(payload);
    return c.json({
      success: true,
      messageId,
      dryRun: process.env.FEISHU_DRY_RUN !== 'false',
      payload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '飞书测试失败';
    return c.json({ success: false, error: message }, 500);
  }
});

devFeishuRouter.post('/feishu-close/:messageId', async (c) => {
  const messageId = c.req.param('messageId');
  const result = (c.req.query('result') ?? 'approved') as 'approved' | 'rejected' | 'recalled' | 'acknowledged';
  try {
    await getNotifyProvider().closeTodo(messageId, result);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '关闭卡片失败';
    return c.json({ success: false, error: message }, 500);
  }
});

export { devFeishuRouter };
