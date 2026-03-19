import { Hono } from 'hono';
import * as approvalService from '../services/approval.js';

const webhooksRouter = new Hono();

/**
 * 飞书审批回调
 * 当审批人在飞书待办中操作时，飞书会调用此接口
 * PoC 阶段简化签名验证
 */
webhooksRouter.post('/feishu/approval-callback', async (c) => {
  try {
    const body = await c.req.json<{
      approvalId: string;
      approverId: string;
      approverName: string;
      action: 'approve' | 'reject';
      comment?: string;
    }>();

    if (!body.approvalId || !body.approverId || !body.action) {
      return c.json({ success: false, error: '参数不完整' }, 400);
    }

    const result = await approvalService.processApproval(
      body.approvalId,
      body.approverId,
      body.action,
      body.comment,
      body.approverName,
    );

    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '回调处理失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

export { webhooksRouter };
