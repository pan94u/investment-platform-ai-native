import type { NotifyProvider, TodoPayload } from './types.js';

const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

/**
 * 飞书待办通知提供者
 * 使用飞书 Task V2 API 推送审批待办
 * 所有调用 try/catch — 飞书故障不阻断审批流程
 */
export class FeishuNotifyProvider implements NotifyProvider {
  private appId: string;
  private appSecret: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.appId = process.env.FEISHU_APP_ID ?? '';
    this.appSecret = process.env.FEISHU_APP_SECRET ?? '';
  }

  private async getTenantToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.appId, app_secret: this.appSecret }),
    });

    const data = await res.json() as { tenant_access_token: string; expire: number };
    this.tokenCache = {
      token: data.tenant_access_token,
      expiresAt: Date.now() + (data.expire - 300) * 1000, // 提前 5 分钟过期
    };
    return this.tokenCache.token;
  }

  private async request(method: string, path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const token = await this.getTenantToken();
    const res = await fetch(`${FEISHU_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<Record<string, unknown>>;
  }

  async pushTodo(payload: TodoPayload): Promise<string | null> {
    try {
      const summary = `[投资备案审批] ${payload.filingTitle}`;
      const description = [
        `编号: ${payload.filingNumber}`,
        `类型: ${payload.filingType}`,
        `金额: ${payload.amount}万元`,
        `发起人: ${payload.creatorName}`,
        `审批级别: ${payload.level === 1 ? '直属上级' : '集团审批'}`,
      ].join('\n');

      const data = await this.request('POST', '/task/v2/tasks', {
        summary,
        description,
        extra: JSON.stringify({
          approvalId: payload.approvalId,
          filingId: payload.filingId,
        }),
      });

      const taskId = (data.data as Record<string, unknown>)?.task_id as string | undefined;
      console.log(`[Feishu] pushTodo OK → taskId=${taskId}`);
      return taskId ?? null;
    } catch (err) {
      console.error('[Feishu] pushTodo failed:', err);
      return null;
    }
  }

  async updateTodo(externalTodoId: string, update: Record<string, string>): Promise<void> {
    try {
      await this.request('PATCH', `/task/v2/tasks/${externalTodoId}`, {
        summary: update.summary,
      });
      console.log(`[Feishu] updateTodo OK → ${externalTodoId}`);
    } catch (err) {
      console.error('[Feishu] updateTodo failed:', err);
    }
  }

  async closeTodo(externalTodoId: string, result: string): Promise<void> {
    try {
      await this.request('POST', `/task/v2/tasks/${externalTodoId}/complete`, {});
      console.log(`[Feishu] closeTodo OK → ${externalTodoId} (${result})`);
    } catch (err) {
      console.error('[Feishu] closeTodo failed:', err);
    }
  }
}
