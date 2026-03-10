import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import * as aiService from '../services/ai-mock.js';
import * as filingService from '../services/filing.js';
import * as conversationService from '../services/conversation.js';
import * as approvalService from '../services/approval.js';

const aiRouter = new Hono<AppEnv>();

aiRouter.use('/*', authMiddleware);

/**
 * POST /api/ai/chat — 对话式备案
 * Body: { conversationId?: string, message: string, attachmentName?: string }
 *
 * 核心 V2 交互：用户用自然语言描述需求，AI 返回预填充表单
 */
aiRouter.post('/chat', async (c) => {
  const user = c.get('user');
  const { conversationId, message, attachmentName } = await c.req.json<{
    conversationId?: string;
    message: string;
    attachmentName?: string;
  }>();

  if (!message || message.trim().length === 0) {
    return c.json({ success: false, data: null, error: '消息不能为空' }, 400);
  }

  try {
    // 1. 获取或创建会话
    let convId = conversationId;
    let conversation = convId ? conversationService.getConversation(convId) : undefined;

    if (!conversation) {
      conversation = conversationService.createConversation(user.id);
      convId = conversation.id;
    }

    // 2. 记录用户消息
    conversationService.addMessage(convId!, 'user', message);

    // 3. 如果有附件，先做文档提取
    let extractResult = null;
    if (attachmentName) {
      extractResult = aiService.extractFromDocument(attachmentName);
    }

    // 4. 生成 AI 预填充
    const prefillResult = aiService.generatePrefill(message);

    // 5. 如果有文档提取结果，合并（文档提取优先级更高）
    let mergedFields = { ...prefillResult.fields };
    let mergedSources = { ...prefillResult.fieldSources };
    if (extractResult && Object.keys(extractResult.extractedFields).length > 0) {
      mergedFields = { ...mergedFields, ...extractResult.extractedFields };
      mergedSources = { ...mergedSources, ...extractResult.fieldSources };
    }

    // 6. 构建助手回复
    let assistantContent = prefillResult.explanation;
    if (extractResult && extractResult.confidence > 0.5) {
      assistantContent += `\n\n📄 同时，我从上传的文档「${attachmentName}」中提取了关键信息：${extractResult.summary}`;
    }

    // 7. 记录助手消息
    const assistantMessage = conversationService.addMessage(convId!, 'assistant', assistantContent, {
      fieldSources: mergedSources,
    });

    return c.json({
      success: true,
      data: {
        conversationId: convId,
        message: assistantMessage,
        prefill: {
          fields: mergedFields,
          fieldSources: mergedSources,
          confidence: prefillResult.confidence,
          explanation: prefillResult.explanation,
        },
        documentExtraction: extractResult,
      },
      error: null,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '对话处理失败';
    return c.json({ success: false, data: null, error: errMsg }, 500);
  }
});

/**
 * POST /api/ai/chat/:conversationId/create-filing — 从对话创建备案
 * Body: { fields: Record<string, any> }  (可选覆盖字段)
 */
aiRouter.post('/chat/:conversationId/create-filing', async (c) => {
  const user = c.get('user');
  const convId = c.req.param('conversationId');
  const { fields } = await c.req.json<{ fields?: Record<string, any> }>();

  const conversation = conversationService.getConversation(convId);
  if (!conversation) {
    return c.json({ success: false, data: null, error: '会话不存在' }, 404);
  }

  try {
    // 从最近的助手消息中获取预填充数据，合并用户覆盖
    const lastUserMessage = [...conversation.messages].reverse().find((m) => m.role === 'user');
    const prefillResult = aiService.generatePrefill(lastUserMessage?.content || '');

    const mergedFields = { ...prefillResult.fields, ...fields };

    const filing = await filingService.createFilingFromAI(
      { ...prefillResult, fields: mergedFields },
      user.id,
    );

    // 关联会话到备案
    conversationService.linkConversationToFiling(convId, filing.id);

    // 记录系统消息
    conversationService.addMessage(convId, 'system', `备案已创建：${filing.filingNumber}`, {
      filingId: filing.id,
    });

    return c.json({ success: true, data: filing, error: null }, 201);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '创建备案失败';
    return c.json({ success: false, data: null, error: errMsg }, 500);
  }
});

/**
 * POST /api/ai/extract — 文档提取
 * Body: { filename: string, content?: string }
 */
aiRouter.post('/extract', async (c) => {
  const { filename, content } = await c.req.json<{ filename: string; content?: string }>();

  if (!filename) {
    return c.json({ success: false, data: null, error: '缺少文件名' }, 400);
  }

  const result = aiService.extractFromDocument(filename, content);
  return c.json({ success: true, data: result, error: null });
});

/**
 * POST /api/ai/risk-assess/:filingId — 风险评估
 */
aiRouter.post('/risk-assess/:filingId', async (c) => {
  const filingId = c.req.param('filingId');
  const filing = await filingService.getFilingById(filingId);

  if (!filing) {
    return c.json({ success: false, data: null, error: '备案不存在' }, 404);
  }

  // 获取项目历史
  const history = await filingService.getFilingHistory(filing.projectName);

  // 执行风险评估
  const assessment = aiService.assessRisk(filing, history);

  return c.json({ success: true, data: assessment, error: null });
});

/**
 * GET /api/ai/summary/:filingId — AI 审批摘要
 *
 * 为审批人生成一页纸摘要，包括：
 * - 一句话概述
 * - 关键要点
 * - 风险高亮
 * - 建议审批意见
 */
aiRouter.get('/summary/:filingId', async (c) => {
  const filingId = c.req.param('filingId');
  const filing = await filingService.getFilingById(filingId);

  if (!filing) {
    return c.json({ success: false, data: null, error: '备案不存在' }, 404);
  }

  // 获取项目历史
  const history = await filingService.getFilingHistory(filing.projectName);

  // 生成摘要
  const summary = aiService.generateSummary(filing, history);

  // 生成风险评估
  const riskAssessment = aiService.assessRisk(filing, history);

  // 生成审批意见建议
  const opinionSuggestion = aiService.generateApprovalSuggestion(filing, riskAssessment);

  return c.json({
    success: true,
    data: {
      summary,
      riskAssessment,
      opinionSuggestion,
    },
    error: null,
  });
});

/**
 * POST /api/ai/baseline-check — 提交前基线检查
 * Body: 备案字段
 */
aiRouter.post('/baseline-check', async (c) => {
  const filingFields = await c.req.json();

  const result = aiService.checkBaseline(filingFields);

  return c.json({ success: true, data: result, error: null });
});

/**
 * POST /api/ai/query — 对话式数据查询
 * Body: { question: string }
 */
aiRouter.post('/query', async (c) => {
  const { question } = await c.req.json<{ question: string }>();

  if (!question || question.trim().length === 0) {
    return c.json({ success: false, data: null, error: '问题不能为空' }, 400);
  }

  // 获取统计数据作为上下文
  const stats = await filingService.getDashboardStats();

  const result = aiService.answerQuery(question, stats);

  return c.json({ success: true, data: result, error: null });
});

/**
 * GET /api/ai/conversations — 获取用户会话列表
 */
aiRouter.get('/conversations', async (c) => {
  const user = c.get('user');
  const conversations = conversationService.listConversations(user.id);
  return c.json({ success: true, data: conversations, error: null });
});

/**
 * GET /api/ai/conversations/:id — 获取会话详情
 */
aiRouter.get('/conversations/:id', async (c) => {
  const conversation = conversationService.getConversation(c.req.param('id'));
  if (!conversation) {
    return c.json({ success: false, data: null, error: '会话不存在' }, 404);
  }
  return c.json({ success: true, data: conversation, error: null });
});

export { aiRouter };
