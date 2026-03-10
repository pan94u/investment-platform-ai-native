import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import { executeTool, toolDefinitions } from '../tools/filing-tools.js';
import { getPersona, isToolAllowed } from '../personas/persona-manager.js';
import { runPreHooks, runPostHooks } from '../rules/compliance-rules.js';
import { logSecurityEvent } from '../middleware/security.js';

const mcpRouter = new Hono<AppEnv>();

mcpRouter.use('/*', authMiddleware);

/**
 * POST /api/mcp/tools/call — 执行 MCP 工具
 *
 * 完整管道:
 *   persona check → pre-hook compliance → execute tool (sanitize→permission→execute→validate→audit) → post-hook
 */
mcpRouter.post('/tools/call', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ tool: string; arguments: Record<string, unknown> }>();

  if (!body.tool) {
    return c.json({ success: false, data: null, error: '缺少 tool 参数' }, 400);
  }

  const toolName = body.tool;
  const toolArgs = body.arguments ?? {};

  // 1. Persona 检查
  const persona = getPersona(user.role);
  if (!isToolAllowed(persona.id, toolName)) {
    logSecurityEvent({
      type: 'permission_check',
      userId: user.id,
      action: toolName,
      sanitized: false,
      allowed: false,
      reason: `Persona ${persona.id} 不允许使用工具 ${toolName}`,
    });
    return c.json({
      success: false,
      data: null,
      error: `当前角色（${persona.name}）无权使用工具 ${toolName}`,
    }, 403);
  }

  // 2. Pre-hook 合规检查
  if (['filing_create', 'filing_update', 'filing_submit'].includes(toolName)) {
    const complianceResult = runPreHooks(toolName, toolArgs as Record<string, string | number | undefined>);
    if (!complianceResult.passed) {
      return c.json({
        success: false,
        data: {
          violations: complianceResult.violations,
          warnings: complianceResult.warnings,
        },
        error: `合规检查未通过: ${complianceResult.violations.map((v) => v.message).join('; ')}`,
      }, 422);
    }

    // 有警告但不阻断
    if (complianceResult.warnings.length > 0) {
      // 将警告附加到参数中，工具可选择使用
      (toolArgs as Record<string, unknown>)._complianceWarnings = complianceResult.warnings;
    }
  }

  // 3. 执行工具（内部包含 sanitize → permission → execute → validate → audit）
  const result = await executeTool(toolName, toolArgs, user.id, user.role);

  // 4. Post-hook（审批操作后的同步和快照）
  if (['filing_submit', 'approval_approve', 'approval_reject'].includes(toolName) && !result.isError) {
    runPostHooks(toolName, { ...toolArgs, userId: user.id });
  }

  return c.json({
    success: !result.isError,
    data: result,
    error: result.isError ? '工具执行出错' : null,
    _meta: {
      tool: toolName,
      persona: persona.id,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/mcp/tools/list — 列出当前用户可用的工具
 */
mcpRouter.get('/tools/list', async (c) => {
  const user = c.get('user');
  const persona = getPersona(user.role);

  const availableTools = toolDefinitions.filter((t) =>
    persona.allowedTools.includes(t.name),
  );

  return c.json({
    success: true,
    data: {
      persona: {
        id: persona.id,
        name: persona.name,
        description: persona.description,
      },
      tools: availableTools,
      totalTools: availableTools.length,
    },
    error: null,
  });
});

/**
 * GET /api/mcp/personas — 获取当前用户的 persona 配置
 */
mcpRouter.get('/personas', async (c) => {
  const user = c.get('user');
  const persona = getPersona(user.role);

  return c.json({
    success: true,
    data: {
      userId: user.id,
      role: user.role,
      persona: {
        id: persona.id,
        name: persona.name,
        description: persona.description,
        allowedTools: persona.allowedTools,
        systemPrompt: persona.systemPrompt,
      },
    },
    error: null,
  });
});

export { mcpRouter };
