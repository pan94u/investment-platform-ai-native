import { Hono } from 'hono';
import { getNotifyProvider } from '../providers/index.js';
import { FeishuNotifyProvider } from '../providers/notify-feishu.js';
import type { TodoPayload } from '../providers/types.js';

/**
 * 开发期飞书测试 endpoint —— 不挂载到生产
 *
 * 三种触发方式：
 *   1. 工号路径（走 org 表查邮箱）:
 *      POST /api/_dev/feishu-card?empCode=20111223
 *   2. 手机号路径（绕过 org 表，直接查 open_id）:
 *      POST /api/_dev/feishu-card?mobile=13800138000
 *   3. open_id 直接发（跳过所有解析）:
 *      POST /api/_dev/feishu-card?openId=ou_xxx
 *
 * Body 可选: { filingTitle, filingNumber, amount, creatorName, ... }
 */
const devFeishuRouter = new Hono();

devFeishuRouter.post('/feishu-card', async (c) => {
  const empCode = c.req.query('empCode');
  const mobile = c.req.query('mobile');
  const openIdQuery = c.req.query('openId');

  if (!empCode && !mobile && !openIdQuery) {
    return c.json({ success: false, error: '必须提供 empCode、mobile 或 openId 中的至少一个' }, 400);
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
    approverUserId: empCode ?? 'dev-test',
    approverName: body.approverName ?? empCode ?? mobile ?? 'test',
    stage: body.stage ?? 'business',
    level: body.level ?? 1,
    groupName: body.groupName,
    creatorName: body.creatorName ?? '测试发起人',
    amount: body.amount ?? '1000',
    filingType: body.filingType ?? 'equity_direct',
  };

  console.log('[DEV] 触发飞书卡片测试 payload:', JSON.stringify(payload));

  try {
    const provider = getNotifyProvider();
    let messageId: string | null = null;
    let resolvedPath = '';

    if (openIdQuery) {
      // 路径 3：直接用 open_id
      resolvedPath = `openId=${openIdQuery}`;
      if (provider instanceof FeishuNotifyProvider) {
        messageId = await provider.pushTodoToOpenId(openIdQuery, payload);
      } else {
        return c.json({ success: false, error: 'NotifyProvider 非飞书实现，无法直接用 openId' }, 400);
      }
    } else if (mobile) {
      // 路径 2：手机号查 open_id 再发
      resolvedPath = `mobile=${mobile}`;
      if (provider instanceof FeishuNotifyProvider) {
        const openId = await provider.getOpenIdByMobile(mobile);
        if (!openId) {
          return c.json({ success: false, error: `手机号 ${mobile} 在飞书通讯录无对应用户` }, 404);
        }
        messageId = await provider.pushTodoToOpenId(openId, payload);
      } else {
        return c.json({ success: false, error: 'NotifyProvider 非飞书实现，无法用 mobile 查询' }, 400);
      }
    } else {
      // 路径 1：工号 → org 表邮箱 → open_id
      resolvedPath = `empCode=${empCode}`;
      messageId = await provider.pushTodo(payload);
    }

    return c.json({
      success: true,
      messageId,
      resolvedPath,
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

/**
 * 飞书应用诊断 — 一次性输出应用能看到的范围
 *  - 租户信息
 *  - 通讯录权限范围（能访问哪些部门/用户）
 *  - 第一级部门列表
 */
devFeishuRouter.get('/feishu-diagnose', async (c) => {
  const appId = process.env.FEISHU_APP_ID ?? '';
  const appSecret = process.env.FEISHU_APP_SECRET ?? '';
  if (!appId || !appSecret) {
    return c.json({ success: false, error: '未配置 FEISHU_APP_ID/SECRET' }, 400);
  }

  const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

  // 1. 换 token
  const tokenRes = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const tokenData = (await tokenRes.json()) as { tenant_access_token: string; code?: number; msg?: string };
  if (tokenData.code && tokenData.code !== 0) {
    return c.json({ success: false, error: `拿不到 token: ${tokenData.msg}`, tokenData });
  }
  const token = tokenData.tenant_access_token;
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 并行调用几个诊断接口
  const [scopeRes, deptRes, rootDeptRes, tenantRes] = await Promise.allSettled([
    fetch(`${FEISHU_BASE}/contact/v3/scopes?user_id_type=open_id&page_size=50`, { headers: authHeaders }),
    fetch(`${FEISHU_BASE}/contact/v3/departments?department_id_type=open_department_id&page_size=20`, { headers: authHeaders }),
    fetch(`${FEISHU_BASE}/contact/v3/departments/0?department_id_type=open_department_id`, { headers: authHeaders }),
    fetch(`${FEISHU_BASE}/tenant/v2/tenant/query`, { headers: authHeaders }),
  ]);

  const parse = async (r: PromiseSettledResult<Response>) => {
    if (r.status === 'rejected') return { error: String(r.reason) };
    try {
      return await r.value.json();
    } catch {
      return { error: 'parse failed' };
    }
  };

  return c.json({
    success: true,
    appId: `${appId.slice(0, 12)}...`,
    tokenOk: !!token,
    diagnostics: {
      scopes: await parse(scopeRes),
      departments: await parse(deptRes),
      rootDepartment: await parse(rootDeptRes),
      tenant: await parse(tenantRes),
    },
  });
});

export { devFeishuRouter };
