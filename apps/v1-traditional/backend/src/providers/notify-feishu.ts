import type { NotifyProvider, TodoPayload } from './types.js';

const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

/**
 * 飞书 IM 卡片通知提供者
 *
 * 设计：
 * - pushTodo → 发送 interactive 卡片消息到 approver 的飞书 IM
 *   按钮跳链接到 ${FEISHU_TODO_LINK_BASE}/todos/${approvalId}（移动端待办页）
 *   返回 message_id 存到 approvals.external_todo_id 用于后续更新
 * - closeTodo → 更新卡片为「已处理 + 结果」状态（PATCH 卡片）
 * - emp_code → open_id 用 contact/v3/users/batch_get_id 解析，内存缓存
 *
 * 环境变量：
 * - FEISHU_APP_ID / FEISHU_APP_SECRET：应用凭证
 * - FEISHU_TODO_LINK_BASE：卡片按钮链接 base（如 https://test.example.com）
 * - FEISHU_DRY_RUN=true：开发期不真发，只 console.log（默认 true 防误推）
 *
 * 所有调用 try/catch — 飞书故障不阻断审批流程
 */
export class FeishuNotifyProvider implements NotifyProvider {
  private appId: string;
  private appSecret: string;
  private linkBase: string;
  private dryRun: boolean;
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private openIdCache = new Map<string, string>(); // emp_code → open_id

  constructor() {
    this.appId = process.env.FEISHU_APP_ID ?? '';
    this.appSecret = process.env.FEISHU_APP_SECRET ?? '';
    this.linkBase = (process.env.FEISHU_TODO_LINK_BASE ?? 'http://localhost:3100').replace(/\/$/, '');
    this.dryRun = process.env.FEISHU_DRY_RUN !== 'false';
    console.log(
      `[Feishu] init appId=${this.appId.slice(0, 8)}... linkBase=${this.linkBase} dryRun=${this.dryRun}`,
    );
  }

  // ─── tenant_access_token 缓存 ────────────────────────

  private async getTenantToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.appId, app_secret: this.appSecret }),
    });

    const data = (await res.json()) as { tenant_access_token: string; expire: number; code?: number; msg?: string };
    if (data.code && data.code !== 0) {
      throw new Error(`tenant_access_token 失败 code=${data.code} msg=${data.msg}`);
    }
    this.tokenCache = {
      token: data.tenant_access_token,
      expiresAt: Date.now() + (data.expire - 300) * 1000, // 提前 5 分钟过期
    };
    return this.tokenCache.token;
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const token = await this.getTenantToken();
    const res = await fetch(`${FEISHU_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await res.json()) as Record<string, unknown>;
  }

  // ─── emp_code → open_id 解析（带缓存）────────────────

  /** 通过工号查询飞书 open_id，缓存到内存避免重复调用 */
  private async getOpenIdByEmpCode(empCode: string): Promise<string | null> {
    if (this.openIdCache.has(empCode)) {
      return this.openIdCache.get(empCode) ?? null;
    }
    try {
      const data = await this.request(
        'POST',
        '/contact/v3/users/batch_get_id?user_id_type=open_id',
        { emails: [], mobiles: [], employee_ids: [empCode] },
      );
      // 响应结构: { data: { user_list: [{ employee_id, user_id, mobile, email }] } }
      const userList = ((data.data as Record<string, unknown>)?.user_list as Array<Record<string, unknown>>) ?? [];
      const match = userList.find((u) => u.employee_id === empCode);
      const openId = (match?.user_id as string) ?? null;
      if (openId) {
        this.openIdCache.set(empCode, openId);
      } else {
        console.warn(`[Feishu] empCode=${empCode} 未找到 open_id, 响应:`, JSON.stringify(data).slice(0, 300));
      }
      return openId;
    } catch (err) {
      console.error(`[Feishu] getOpenIdByEmpCode(${empCode}) failed:`, err);
      return null;
    }
  }

  // ─── 卡片构造 ────────────────────────────────────────

  /** 构造审批待办的 interactive 卡片 */
  private buildApprovalCard(payload: TodoPayload, status: 'pending' | 'closed', closedResult?: string): Record<string, unknown> {
    const linkUrl = `${this.linkBase}/todos/${payload.approvalId}`;
    const stageLabel =
      payload.stage === 'business'
        ? `业务审批 L${payload.level}`
        : payload.stage === 'group'
          ? `集团审批${payload.groupName ? `（${payload.groupName}）` : ''}`
          : payload.stage === 'confirmation'
            ? '最终确认'
            : payload.stage;

    const headerColor = status === 'closed' ? 'grey' : 'blue';
    const headerTitle = status === 'closed' ? `已处理 · ${closedResult ?? ''}` : '投资备案审批待办';

    const elements: Record<string, unknown>[] = [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**${payload.filingTitle}**\n${payload.filingNumber}`,
        },
      },
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `**类型**\n${payload.filingType}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**金额**\n${Number(payload.amount).toLocaleString()} 万元` } },
          { is_short: true, text: { tag: 'lark_md', content: `**发起人**\n${payload.creatorName}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**审批阶段**\n${stageLabel}` } },
        ],
      },
    ];

    if (status === 'pending') {
      elements.push({
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '处理审批' },
            type: 'primary',
            url: linkUrl,
          },
        ],
      });
    } else {
      elements.push({
        tag: 'note',
        elements: [{ tag: 'plain_text', content: '此条审批已处理，可点击下方链接查看详情' }],
      });
      elements.push({
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '查看详情' },
            type: 'default',
            url: linkUrl,
          },
        ],
      });
    }

    return {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: headerTitle },
        template: headerColor,
      },
      elements,
    };
  }

  // ─── NotifyProvider 实现 ─────────────────────────────

  async pushTodo(payload: TodoPayload): Promise<string | null> {
    try {
      // dry_run 模式：只 console.log，不真发
      if (this.dryRun) {
        console.log(
          `[Feishu DRY_RUN] pushTodo to empCode=${payload.approverUserId} (${payload.approverName})`,
          `\n  filing: ${payload.filingTitle} (${payload.filingNumber})`,
          `\n  link:   ${this.linkBase}/todos/${payload.approvalId}`,
        );
        return `dry-run-${payload.approvalId}`;
      }

      const openId = await this.getOpenIdByEmpCode(payload.approverUserId);
      if (!openId) {
        console.warn(`[Feishu] pushTodo skip: empCode=${payload.approverUserId} 无对应 open_id`);
        return null;
      }

      const card = this.buildApprovalCard(payload, 'pending');

      const data = await this.request('POST', '/im/v1/messages?receive_id_type=open_id', {
        receive_id: openId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      });

      const code = data.code as number | undefined;
      if (code !== 0 && code !== undefined) {
        console.error(`[Feishu] pushTodo 业务失败 code=${code} msg=${data.msg}`);
        return null;
      }

      const messageId = ((data.data as Record<string, unknown>)?.message_id as string) ?? null;
      console.log(`[Feishu] pushTodo OK → empCode=${payload.approverUserId} message_id=${messageId}`);
      return messageId;
    } catch (err) {
      console.error('[Feishu] pushTodo failed:', err);
      return null;
    }
  }

  async updateTodo(externalTodoId: string, update: Record<string, string>): Promise<void> {
    // 当前实现：简单 noop（pushTodo / closeTodo 已覆盖主要场景）
    // 如需要支持中间状态更新（比如重新分配），扩展此方法
    console.log(`[Feishu] updateTodo noop → ${externalTodoId}`, update);
  }

  /**
   * 关闭待办：将卡片状态更新为「已处理」
   * 飞书 PATCH /im/v1/messages/{message_id} 仅支持更新 interactive 卡片内容
   */
  async closeTodo(externalTodoId: string, result: 'approved' | 'rejected' | 'recalled' | 'acknowledged'): Promise<void> {
    if (!externalTodoId || externalTodoId.startsWith('dry-run-')) {
      console.log(`[Feishu DRY_RUN] closeTodo ${externalTodoId} (${result})`);
      return;
    }

    try {
      const resultLabel: Record<string, string> = {
        approved: '已同意',
        rejected: '已驳回',
        recalled: '已撤回',
        acknowledged: '已知悉',
      };

      // 简化：仅 PATCH 卡片的 header 提示。
      // 完整 PATCH 需要原始 payload，先做最小可行实现：
      // 用一个仅 header 的占位卡片更新（如果飞书拒绝，至少 fallback 到不更新）
      const minimalCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: 'plain_text', content: `已处理 · ${resultLabel[result] ?? result}` },
          template: 'grey',
        },
        elements: [
          {
            tag: 'note',
            elements: [{ tag: 'plain_text', content: '此条审批待办已处理' }],
          },
        ],
      };

      const data = await this.request('PATCH', `/im/v1/messages/${externalTodoId}`, {
        content: JSON.stringify(minimalCard),
      });

      const code = data.code as number | undefined;
      if (code !== 0 && code !== undefined) {
        console.error(`[Feishu] closeTodo 业务失败 code=${code} msg=${data.msg}`);
        return;
      }
      console.log(`[Feishu] closeTodo OK → ${externalTodoId} (${result})`);
    } catch (err) {
      console.error('[Feishu] closeTodo failed:', err);
    }
  }
}
