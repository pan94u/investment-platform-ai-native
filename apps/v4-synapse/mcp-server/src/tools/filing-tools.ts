import { eq, and, ilike, gte, lte, sql, desc, count, inArray } from 'drizzle-orm';
import { filings, approvals, users, auditLogs } from '@filing/database';
import type { MCPToolResponse } from '@filing/shared';
import { db } from '../lib/db.js';
import { generateId, generateFilingNumber } from '../lib/id.js';
import {
  sanitizeInput,
  validateOutput,
  checkPermission,
  enforceHumanBoundary,
  logSecurityEvent,
  getRiskAssessmentAudit,
} from '../middleware/security.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToolArgs = Record<string, unknown>;
type ToolFn = (args: ToolArgs, userId: string) => Promise<MCPToolResponse>;

// ---------------------------------------------------------------------------
// Helper: MCP response builders
// ---------------------------------------------------------------------------

function textResponse(data: unknown): MCPToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function errorResponse(message: string): MCPToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// Helper: get next filing seq
// ---------------------------------------------------------------------------

async function getNextSeq(): Promise<number> {
  const today = new Date();
  const datePrefix = `BG${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const result = await db
    .select({ cnt: count() })
    .from(filings)
    .where(ilike(filings.filingNumber, `${datePrefix}%`));
  return (result[0]?.cnt ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// Tool 1: filing_create
// ---------------------------------------------------------------------------

const filingCreate: ToolFn = async (args, userId) => {
  const { type, title, description, projectName, legalEntityName, domain, industry, amount, currency, investmentRatio, valuationAmount, originalTarget, newTarget, changeReason } = args as Record<string, string | number | undefined>;

  if (!type || !title || !projectName || !domain || !industry || amount == null) {
    return errorResponse('缺少必填字段：type, title, projectName, domain, industry, amount');
  }

  const seq = await getNextSeq();
  const id = generateId('filing');
  const filingNumber = generateFilingNumber(seq);

  const [filing] = await db.insert(filings).values({
    id,
    filingNumber,
    type: String(type),
    title: String(title),
    description: String(description ?? ''),
    projectName: String(projectName),
    legalEntityName: legalEntityName ? String(legalEntityName) : null,
    domain: String(domain),
    industry: String(industry),
    amount: String(amount),
    currency: String(currency ?? 'CNY'),
    investmentRatio: investmentRatio != null ? String(investmentRatio) : null,
    valuationAmount: valuationAmount != null ? String(valuationAmount) : null,
    originalTarget: originalTarget != null ? String(originalTarget) : null,
    newTarget: newTarget != null ? String(newTarget) : null,
    changeReason: changeReason ? String(changeReason) : null,
    status: 'draft',
    creatorId: userId,
  }).returning();

  return textResponse({ message: '备案创建成功', filing });
};

// ---------------------------------------------------------------------------
// Tool 2: filing_update
// ---------------------------------------------------------------------------

const filingUpdate: ToolFn = async (args, userId) => {
  const filingId = String(args.filingId ?? args.id ?? '');
  if (!filingId) return errorResponse('缺少参数: filingId');

  const existing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (existing.length === 0) return errorResponse('备案不存在');
  if (existing[0].status !== 'draft') return errorResponse('仅草稿状态可编辑');
  if (existing[0].creatorId !== userId) return errorResponse('无权编辑此备案');

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ['type', 'title', 'description', 'projectName', 'legalEntityName', 'domain', 'industry', 'currency', 'changeReason'] as const;
  for (const f of fields) {
    if (args[f] !== undefined) updateData[f] = String(args[f]);
  }
  const numericFields = ['amount', 'investmentRatio', 'valuationAmount', 'originalTarget', 'newTarget'] as const;
  for (const f of numericFields) {
    if (args[f] !== undefined) updateData[f] = args[f] != null ? String(args[f]) : null;
  }

  const [updated] = await db.update(filings).set(updateData).where(eq(filings.id, filingId)).returning();
  return textResponse({ message: '备案更新成功', filing: updated });
};

// ---------------------------------------------------------------------------
// Tool 3: filing_submit
// ---------------------------------------------------------------------------

const filingSubmit: ToolFn = async (args, userId) => {
  const filingId = String(args.filingId ?? args.id ?? '');
  if (!filingId) return errorResponse('缺少参数: filingId');

  // 人机边界检查
  const boundary = enforceHumanBoundary('filing_submit');
  if (boundary.requiresHuman && !args._humanConfirmed) {
    return textResponse({
      requiresHumanConfirmation: true,
      reason: boundary.reason,
      message: '此操作需要人工确认。请在参数中传入 _humanConfirmed: true 以确认提交。',
    });
  }

  const existing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (existing.length === 0) return errorResponse('备案不存在');
  if (existing[0].status !== 'draft') return errorResponse('仅草稿状态可提交');
  if (existing[0].creatorId !== userId) return errorResponse('无权提交此备案');

  // 查找上级审批人
  const supervisors = await db.select().from(users).where(eq(users.role, 'supervisor'));
  if (supervisors.length === 0) return errorResponse('未找到上级审批人');

  const now = new Date();

  await db.insert(approvals).values({
    id: generateId('approval'),
    filingId,
    approverId: supervisors[0].id,
    approverName: supervisors[0].name,
    stage: 'business',
    level: 1,
    status: 'pending',
  });

  const [updated] = await db
    .update(filings)
    .set({ status: 'pending_business', submittedAt: now, updatedAt: now })
    .where(eq(filings.id, filingId))
    .returning();

  return textResponse({ message: '备案已提交审批', filing: updated });
};

// ---------------------------------------------------------------------------
// Tool 4: filing_get
// ---------------------------------------------------------------------------

const filingGet: ToolFn = async (args) => {
  const filingId = String(args.filingId ?? args.id ?? '');
  if (!filingId) return errorResponse('缺少参数: filingId');

  const result = await db
    .select()
    .from(filings)
    .leftJoin(users, eq(filings.creatorId, users.id))
    .where(eq(filings.id, filingId))
    .limit(1);

  if (result.length === 0) return errorResponse('备案不存在');

  const { filings: filing, users: creator } = result[0];
  return textResponse({
    ...filing,
    creator: creator ? { id: creator.id, name: creator.name, department: creator.department } : null,
  });
};

// ---------------------------------------------------------------------------
// Tool 5: filing_list
// ---------------------------------------------------------------------------

const filingList: ToolFn = async (args) => {
  const page = Number(args.page ?? 1);
  const pageSize = Math.min(Number(args.pageSize ?? 20), 100);
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (args.type) conditions.push(eq(filings.type, String(args.type)));
  if (args.status) conditions.push(eq(filings.status, String(args.status)));
  if (args.domain) conditions.push(eq(filings.domain, String(args.domain)));
  if (args.creatorId) conditions.push(eq(filings.creatorId, String(args.creatorId)));
  if (args.dateFrom) conditions.push(gte(filings.createdAt, new Date(String(args.dateFrom))));
  if (args.dateTo) conditions.push(lte(filings.createdAt, new Date(String(args.dateTo))));
  if (args.keyword) {
    const kw = `%${String(args.keyword)}%`;
    conditions.push(
      sql`(${filings.title} ILIKE ${kw} OR ${filings.projectName} ILIKE ${kw} OR ${filings.filingNumber} ILIKE ${kw})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select().from(filings).where(where).orderBy(desc(filings.createdAt)).limit(pageSize).offset(offset),
    db.select({ cnt: count() }).from(filings).where(where),
  ]);

  const total = totalResult[0]?.cnt ?? 0;
  return textResponse({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
};

// ---------------------------------------------------------------------------
// Tool 6: filing_extract_from_doc (mock)
// ---------------------------------------------------------------------------

const filingExtractFromDoc: ToolFn = async (args) => {
  const documentUrl = String(args.documentUrl ?? args.url ?? '');
  if (!documentUrl) return errorResponse('缺少参数: documentUrl');

  // PoC: 模拟文档提取结果
  return textResponse({
    message: '文档信息提取完成（模拟）',
    extracted: {
      projectName: '模拟提取项目名称',
      type: 'equity_direct',
      amount: 5000,
      industry: '智能制造',
      domain: 'smart_living',
      investmentRatio: 20,
      valuationAmount: 25000,
      confidence: 0.85,
      source: documentUrl,
    },
    note: 'PoC 模拟数据 — 生产环境将接入 OCR/NLP 文档解析服务',
  });
};

// ---------------------------------------------------------------------------
// Tool 7: filing_risk_assess
// ---------------------------------------------------------------------------

const filingRiskAssess: ToolFn = async (args) => {
  const filingId = String(args.filingId ?? args.id ?? '');

  let filingData: Record<string, unknown>;

  if (filingId) {
    const result = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
    if (result.length === 0) return errorResponse('备案不存在');
    filingData = result[0] as unknown as Record<string, unknown>;
  } else {
    // 允许直接传入数据进行评估
    filingData = args;
  }

  const audit = getRiskAssessmentAudit({
    amount: filingData.amount as string | number | undefined,
    type: filingData.type as string | undefined,
    domain: filingData.domain as string | undefined,
    industry: filingData.industry as string | undefined,
    investmentRatio: filingData.investmentRatio as string | number | null | undefined,
  });

  // 如果是已有备案，更新风险等级
  if (filingId) {
    await db.update(filings).set({ riskLevel: audit.riskLevel, updatedAt: new Date() }).where(eq(filings.id, filingId));
  }

  return textResponse({
    message: '风险评估完成',
    filingId: filingId || undefined,
    ...audit,
  });
};

// ---------------------------------------------------------------------------
// Tool 8: filing_history
// ---------------------------------------------------------------------------

const filingHistory: ToolFn = async (args) => {
  const projectName = args.projectName ? String(args.projectName) : undefined;
  const entityName = args.entityName ? String(args.entityName) : undefined;
  const filingId = args.filingId ? String(args.filingId) : undefined;

  if (!projectName && !entityName && !filingId) {
    return errorResponse('请提供 projectName、entityName 或 filingId 之一');
  }

  const conditions = [];
  if (projectName) conditions.push(ilike(filings.projectName, `%${projectName}%`));
  if (entityName) conditions.push(ilike(filings.legalEntityName, `%${entityName}%`));
  if (filingId) conditions.push(eq(filings.id, filingId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const history = await db
    .select()
    .from(filings)
    .where(where)
    .orderBy(desc(filings.createdAt))
    .limit(50);

  // 获取相关审批记录
  const filingIds = history.map((f) => f.id);
  let approvalHistory: Array<Record<string, unknown>> = [];
  if (filingIds.length > 0) {
    approvalHistory = await db
      .select()
      .from(approvals)
      .where(inArray(approvals.filingId, filingIds))
      .orderBy(desc(approvals.createdAt));
  }

  return textResponse({
    message: `找到 ${history.length} 条历史记录`,
    filings: history,
    approvals: approvalHistory,
  });
};

// ---------------------------------------------------------------------------
// Tool 9: filing_stats
// ---------------------------------------------------------------------------

const filingStats: ToolFn = async () => {
  const [statusCounts, typeCounts, domainCounts, totalAmount, riskCounts] = await Promise.all([
    db.select({ status: filings.status, cnt: count() }).from(filings).groupBy(filings.status),
    db.select({ type: filings.type, cnt: count() }).from(filings).groupBy(filings.type),
    db.select({ domain: filings.domain, cnt: count() }).from(filings).groupBy(filings.domain),
    db.select({ total: sql<string>`COALESCE(SUM(${filings.amount}::numeric), 0)::text` }).from(filings),
    db.select({ riskLevel: filings.riskLevel, cnt: count() }).from(filings).groupBy(filings.riskLevel),
  ]);

  return textResponse({
    byStatus: statusCounts,
    byType: typeCounts,
    byDomain: domainCounts,
    byRiskLevel: riskCounts,
    totalAmount: totalAmount[0]?.total ?? '0',
    totalCount: statusCounts.reduce((sum: number, s: { cnt: number }) => sum + s.cnt, 0),
  });
};

// ---------------------------------------------------------------------------
// Tool 10: filing_anomaly_detect
// ---------------------------------------------------------------------------

const filingAnomalyDetect: ToolFn = async (args) => {
  // 获取全部备案的金额分布
  const allFilings = await db
    .select({
      id: filings.id,
      filingNumber: filings.filingNumber,
      title: filings.title,
      amount: filings.amount,
      type: filings.type,
      domain: filings.domain,
      createdAt: filings.createdAt,
    })
    .from(filings)
    .orderBy(desc(filings.createdAt));

  const amounts = allFilings.map((f) => Number(f.amount));
  if (amounts.length === 0) {
    return textResponse({ message: '暂无备案数据，无法进行异常检测', anomalies: [] });
  }

  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
  const threshold = Number(args.threshold ?? 2); // 标准差倍数

  const anomalies = allFilings
    .filter((f) => Math.abs(Number(f.amount) - mean) > threshold * stdDev)
    .map((f) => ({
      ...f,
      deviation: ((Number(f.amount) - mean) / (stdDev || 1)).toFixed(2),
      anomalyType: Number(f.amount) > mean ? '金额异常偏高' : '金额异常偏低',
    }));

  // 检查时间密集模式
  const recentFilings = allFilings.filter(
    (f) => new Date(f.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
  );
  const timeAnomaly = recentFilings.length > 10
    ? { detected: true, message: `过去7天内有 ${recentFilings.length} 条备案，频率异常偏高` }
    : { detected: false, message: '备案频率正常' };

  return textResponse({
    message: `异常检测完成，发现 ${anomalies.length} 条金额异常`,
    statistics: {
      total: allFilings.length,
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(2),
      threshold: `${threshold}σ`,
    },
    amountAnomalies: anomalies,
    timePatternAnomaly: timeAnomaly,
  });
};

// ---------------------------------------------------------------------------
// Tool Registry & Execution Pipeline
// ---------------------------------------------------------------------------

export const toolRegistry = new Map<string, ToolFn>([
  ['filing_create', filingCreate],
  ['filing_update', filingUpdate],
  ['filing_submit', filingSubmit],
  ['filing_get', filingGet],
  ['filing_list', filingList],
  ['filing_extract_from_doc', filingExtractFromDoc],
  ['filing_risk_assess', filingRiskAssess],
  ['filing_history', filingHistory],
  ['filing_stats', filingStats],
  ['filing_anomaly_detect', filingAnomalyDetect],
]);

/** MCP 工具定义列表 */
export const toolDefinitions = [
  {
    name: 'filing_create',
    description: '创建备案记录（草稿状态）',
    inputSchema: {
      type: 'object',
      required: ['type', 'title', 'projectName', 'domain', 'industry', 'amount'],
      properties: {
        type: { type: 'string', enum: ['equity_direct', 'fund_project', 'fund_investment', 'legal_entity', 'other'] },
        title: { type: 'string' },
        description: { type: 'string' },
        projectName: { type: 'string' },
        legalEntityName: { type: 'string' },
        domain: { type: 'string', enum: ['smart_living', 'industrial_finance', 'health'] },
        industry: { type: 'string' },
        amount: { type: 'number', description: '金额（万元）' },
        currency: { type: 'string', default: 'CNY' },
        investmentRatio: { type: 'number', description: '投资比例 %' },
        valuationAmount: { type: 'number', description: '估值金额（万元）' },
      },
    },
  },
  {
    name: 'filing_update',
    description: '更新备案内容（仅草稿状态可编辑）',
    inputSchema: {
      type: 'object',
      required: ['filingId'],
      properties: {
        filingId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        amount: { type: 'number' },
      },
    },
  },
  {
    name: 'filing_submit',
    description: '提交备案进入审批流程（需人工确认）',
    inputSchema: {
      type: 'object',
      required: ['filingId'],
      properties: {
        filingId: { type: 'string' },
        _humanConfirmed: { type: 'boolean', description: '人工确认标志' },
      },
    },
  },
  {
    name: 'filing_get',
    description: '获取备案详情',
    inputSchema: {
      type: 'object',
      required: ['filingId'],
      properties: { filingId: { type: 'string' } },
    },
  },
  {
    name: 'filing_list',
    description: '查询备案列表（支持筛选、分页）',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        status: { type: 'string' },
        domain: { type: 'string' },
        keyword: { type: 'string' },
        page: { type: 'number' },
        pageSize: { type: 'number' },
      },
    },
  },
  {
    name: 'filing_extract_from_doc',
    description: '从文档中提取备案信息（模拟）',
    inputSchema: {
      type: 'object',
      required: ['documentUrl'],
      properties: { documentUrl: { type: 'string' } },
    },
  },
  {
    name: 'filing_risk_assess',
    description: '评估备案风险等级（含完整透明度审计）',
    inputSchema: {
      type: 'object',
      properties: {
        filingId: { type: 'string' },
        amount: { type: 'number' },
        type: { type: 'string' },
        industry: { type: 'string' },
      },
    },
  },
  {
    name: 'filing_history',
    description: '获取项目/实体的历史备案记录',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: { type: 'string' },
        entityName: { type: 'string' },
        filingId: { type: 'string' },
      },
    },
  },
  {
    name: 'filing_stats',
    description: '获取备案统计数据',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'filing_anomaly_detect',
    description: '检测备案异常模式（金额异常、频率异常）',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: '异常判定标准差倍数（默认2）' },
      },
    },
  },
];

/**
 * 完整的工具执行管道:
 * sanitize → permission check → execute → validate output → audit log
 */
export async function executeTool(
  name: string,
  args: ToolArgs,
  userId: string,
  userRole: string,
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  // 1. 输入净化
  const inputStr = JSON.stringify(args);
  const { sanitized, threats } = sanitizeInput(inputStr);
  let sanitizedArgs = args;
  try {
    sanitizedArgs = JSON.parse(sanitized) as ToolArgs;
  } catch {
    // 保持原始参数
  }

  if (threats.length > 0) {
    logSecurityEvent({
      type: 'ai_input',
      userId,
      action: name,
      input: inputStr.substring(0, 500),
      sanitized: true,
      allowed: true,
      reason: `输入威胁: ${threats.join(', ')}`,
    });
  }

  // 2. 权限检查
  const perm = checkPermission(userId, userRole, name);
  logSecurityEvent({
    type: 'permission_check',
    userId,
    action: name,
    sanitized: false,
    allowed: perm.allowed,
    reason: perm.reason,
  });

  if (!perm.allowed) {
    return errorResponse(`权限不足: ${perm.reason}`);
  }

  // 3. 查找并执行工具
  const toolFn = toolRegistry.get(name);
  if (!toolFn) {
    return errorResponse(`未知工具: ${name}`);
  }

  let response: MCPToolResponse;
  try {
    response = await toolFn(sanitizedArgs, userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : '工具执行失败';
    response = errorResponse(message);
  }

  // 4. 输出校验
  const outputValidation = validateOutput(response);
  if (!outputValidation.valid) {
    logSecurityEvent({
      type: 'ai_output',
      userId,
      action: name,
      output: JSON.stringify(response).substring(0, 500),
      sanitized: false,
      allowed: false,
      reason: `输出问题: ${outputValidation.issues.join(', ')}`,
    });
  }

  // 5. 审计记录
  logSecurityEvent({
    type: 'data_access',
    userId,
    action: name,
    input: inputStr.substring(0, 200),
    output: JSON.stringify(response).substring(0, 200),
    sanitized: threats.length > 0,
    allowed: true,
    reason: `执行耗时 ${Date.now() - startTime}ms`,
  });

  return response;
}
