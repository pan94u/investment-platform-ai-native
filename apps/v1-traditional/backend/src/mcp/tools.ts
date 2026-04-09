import { eq, and, like, gte, lte, sql, desc, count } from 'drizzle-orm';
import { filings, approvals, users } from '@filing/database';
import type { MCPToolResponse } from '@filing/shared';
import { db } from '../lib/db.js';
import * as filingService from '../services/filing.js';
import { resolveFilingId } from '../services/filing.js';
import * as approvalService from '../services/approval.js';
import {
  sanitizeInput, validateOutput, checkPermission,
  enforceHumanBoundary, logSecurityEvent, getRiskAssessmentAudit,
} from './security.js';

// ---------------------------------------------------------------------------
// Types & Helpers
// ---------------------------------------------------------------------------

type ToolArgs = Record<string, unknown>;
type ToolFn = (args: ToolArgs, userId: string, userName: string) => Promise<MCPToolResponse>;

function textResponse(data: unknown): MCPToolResponse {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResponse(message: string): MCPToolResponse {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}

// ---------------------------------------------------------------------------
// Filing Tools — 直接调用 V1 Service 层
// ---------------------------------------------------------------------------

/** Tool 1: filing_create — 调用 filingService.createFiling */
const filingCreate: ToolFn = async (args, userId, userName) => {
  const { type, title, projectName, domain, industry, amount } = args as Record<string, string | number | undefined>;
  if (!type || !title || !projectName || !domain || !industry || amount == null) {
    return errorResponse('缺少必填字段：type, title, projectName, domain, industry, amount');
  }
  const filing = await filingService.createFiling(
    { type: String(type) as any, projectStage: (args.projectStage ? String(args.projectStage) : 'invest') as any, title: String(title), description: String(args.description ?? ''), projectName: String(projectName), legalEntityName: args.legalEntityName ? String(args.legalEntityName) : undefined, domain: String(domain) as any, industry: String(industry), amount: Number(amount), currency: args.currency ? String(args.currency) : undefined, investmentRatio: args.investmentRatio != null ? Number(args.investmentRatio) : undefined, valuationAmount: args.valuationAmount != null ? Number(args.valuationAmount) : undefined, originalTarget: args.originalTarget != null ? Number(args.originalTarget) : undefined, newTarget: args.newTarget != null ? Number(args.newTarget) : undefined, changeReason: args.changeReason ? String(args.changeReason) : undefined },
    userId, userName,
  );
  return textResponse({ message: '备案创建成功', filing });
};

/** Tool 2: filing_update — 调用 filingService.updateFiling */
const filingUpdate: ToolFn = async (args, userId, userName) => {
  const rawId = String(args.filingId ?? '');
  if (!rawId) return errorResponse('缺少参数: filingId');
  const filingId = await resolveFilingId(rawId) ?? rawId;
  const updateData: Record<string, unknown> = {};
  for (const f of ['type', 'title', 'description', 'projectName', 'legalEntityName', 'domain', 'industry', 'changeReason']) {
    if (args[f] !== undefined) updateData[f] = String(args[f]);
  }
  for (const f of ['amount', 'investmentRatio', 'valuationAmount', 'originalTarget', 'newTarget']) {
    if (args[f] !== undefined) updateData[f] = args[f] != null ? Number(args[f]) : undefined;
  }
  const filing = await filingService.updateFiling(filingId, updateData as any, userId, userName);
  return textResponse({ message: '备案更新成功', filing });
};

/** Tool 3: filing_submit — 调用 filingService.submitFiling（含人机边界） */
const filingSubmit: ToolFn = async (args, userId, userName) => {
  const rawId = String(args.filingId ?? '');
  if (!rawId) return errorResponse('缺少参数: filingId');
  const filingId = await resolveFilingId(rawId) ?? rawId;
  const boundary = enforceHumanBoundary('filing_submit');
  if (boundary.requiresHuman && !args._humanConfirmed) {
    return textResponse({ requiresHumanConfirmation: true, reason: boundary.reason, message: '请确认后传入 _humanConfirmed: true' });
  }
  const filing = await filingService.submitFiling(filingId, { id: userId, name: userName, department: '', domain: '' });
  return textResponse({ message: '备案已提交审批', filing });
};

/** Tool 4: filing_recall — 调用 filingService.recallFiling（V1 新增能力） */
const filingRecall: ToolFn = async (args, userId, userName) => {
  const rawId = String(args.filingId ?? '');
  if (!rawId) return errorResponse('缺少参数: filingId');
  const filingId = await resolveFilingId(rawId) ?? rawId;
  const boundary = enforceHumanBoundary('filing_recall');
  if (boundary.requiresHuman && !args._humanConfirmed) {
    return textResponse({ requiresHumanConfirmation: true, reason: boundary.reason, message: '请确认后传入 _humanConfirmed: true' });
  }
  const filing = await filingService.recallFiling(filingId, userId, userName);
  return textResponse({ message: '备案已撤回', filing });
};

/** Tool 5: filing_get — 调用 filingService.getFilingById（支持备案编号或内部 ID） */
const filingGet: ToolFn = async (args) => {
  const rawId = String(args.filingId ?? '');
  if (!rawId) return errorResponse('缺少参数: filingId');
  const filingId = await resolveFilingId(rawId) ?? rawId;
  const filing = await filingService.getFilingById(filingId);
  if (!filing) return errorResponse('备案不存在');
  return textResponse(filing);
};

/** Tool 6: filing_list — 调用 filingService.queryFilings */
const filingList: ToolFn = async (args) => {
  const result = await filingService.queryFilings({
    type: args.type ? String(args.type) as any : undefined,
    status: args.status ? String(args.status) as any : undefined,
    domain: args.domain ? String(args.domain) as any : undefined,
    creatorId: args.creatorId ? String(args.creatorId) : undefined,
    keyword: args.keyword ? String(args.keyword) : undefined,
    dateFrom: args.dateFrom ? String(args.dateFrom) : undefined,
    dateTo: args.dateTo ? String(args.dateTo) : undefined,
    page: args.page ? Number(args.page) : undefined,
    pageSize: args.pageSize ? Number(args.pageSize) : undefined,
  });
  return textResponse(result);
};

/** Tool 7: filing_extract_from_doc — 文档提取（PoC 模拟） */
const filingExtractFromDoc: ToolFn = async (args) => {
  const url = String(args.documentUrl ?? args.url ?? '');
  if (!url) return errorResponse('缺少参数: documentUrl');
  return textResponse({
    message: '文档信息提取完成（模拟）',
    extracted: { projectName: '模拟提取项目名称', type: 'direct_investment', amount: 5000, industry: '智能制造', domain: 'smart_living', investmentRatio: 20, confidence: 0.85, source: url },
    note: 'PoC 模拟数据 — 生产环境将接入 OCR/NLP 服务',
  });
};

/** Tool 8: filing_risk_assess — 风险评估（5因子透明模型） */
const filingRiskAssess: ToolFn = async (args) => {
  let data: Record<string, unknown>;
  const rawId = String(args.filingId ?? '');
  const filingId = rawId ? (await resolveFilingId(rawId) ?? rawId) : '';
  if (filingId) {
    const filing = await filingService.getFilingById(filingId);
    if (!filing) return errorResponse('备案不存在');
    data = filing as unknown as Record<string, unknown>;
  } else {
    data = args;
  }
  const audit = getRiskAssessmentAudit({
    amount: data.amount as string | number | undefined,
    type: data.type as string | undefined,
    industry: data.industry as string | undefined,
    investmentRatio: data.investmentRatio as string | number | null | undefined,
  });
  if (filingId) {
    await db.update(filings).set({ riskLevel: audit.riskLevel, updatedAt: new Date() }).where(eq(filings.id, filingId));
  }
  return textResponse({ message: '风险评估完成', filingId: filingId || undefined, ...audit });
};

/** Tool 9: filing_history — 项目/实体历史查询 */
const filingHistory: ToolFn = async (args) => {
  const projectName = args.projectName ? String(args.projectName) : undefined;
  const entityName = args.entityName ? String(args.entityName) : undefined;
  const filingId = args.filingId ? String(args.filingId) : undefined;
  if (!projectName && !entityName && !filingId) return errorResponse('请提供 projectName、entityName 或 filingId');

  const conditions = [];
  if (projectName) conditions.push(like(filings.projectName, `%${projectName}%`));
  if (entityName) conditions.push(like(filings.legalEntityName, `%${entityName}%`));
  if (filingId) conditions.push(eq(filings.id, filingId));

  const history = await db.select().from(filings).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(filings.createdAt)).limit(50);
  return textResponse({ message: `找到 ${history.length} 条历史记录`, filings: history });
};

/** Tool 10: filing_stats — 调用 filingService.getDashboardStats */
const filingStats: ToolFn = async () => {
  const stats = await filingService.getDashboardStats();
  return textResponse(stats);
};

/** Tool 11: filing_anomaly_detect — 异常检测 */
const filingAnomalyDetect: ToolFn = async (args) => {
  const all = await db.select({ id: filings.id, filingNumber: filings.filingNumber, title: filings.title, amount: filings.amount, type: filings.type, domain: filings.domain, createdAt: filings.createdAt }).from(filings).orderBy(desc(filings.createdAt));
  const amounts = all.map((f) => Number(f.amount));
  if (amounts.length === 0) return textResponse({ message: '暂无数据', anomalies: [] });

  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
  const threshold = Number(args.threshold ?? 2);

  const anomalies = all.filter((f) => Math.abs(Number(f.amount) - mean) > threshold * stdDev).map((f) => ({
    ...f, deviation: ((Number(f.amount) - mean) / (stdDev || 1)).toFixed(2), anomalyType: Number(f.amount) > mean ? '金额异常偏高' : '金额异常偏低',
  }));

  const recent = all.filter((f) => new Date(f.createdAt).getTime() > Date.now() - 7 * 86400000);
  return textResponse({
    message: `异常检测完成，发现 ${anomalies.length} 条金额异常`,
    statistics: { total: all.length, mean: mean.toFixed(2), stdDev: stdDev.toFixed(2), threshold: `${threshold}σ` },
    amountAnomalies: anomalies,
    timePatternAnomaly: recent.length > 10 ? { detected: true, message: `近7天 ${recent.length} 条，频率偏高` } : { detected: false, message: '频率正常' },
  });
};

// ---------------------------------------------------------------------------
// Approval Tools — 调用 V1 审批 Service（升级后的完整能力）
// ---------------------------------------------------------------------------

/** Tool 12: approval_approve — 调用 approvalService.processApproval */
const approvalApprove: ToolFn = async (args, userId, userName) => {
  const approvalId = String(args.approvalId ?? '');
  if (!approvalId) return errorResponse('缺少参数: approvalId');
  const boundary = enforceHumanBoundary('approval_approve');
  if (boundary.requiresHuman && !args._humanConfirmed) {
    return textResponse({ requiresHumanConfirmation: true, reason: boundary.reason, message: '请确认后传入 _humanConfirmed: true' });
  }
  const result = await approvalService.processApproval(approvalId, userId, 'approve', args.comment ? String(args.comment) : undefined, userName);
  return textResponse({ message: '审批通过', ...result });
};

/** Tool 13: approval_reject — 调用 approvalService.processApproval */
const approvalReject: ToolFn = async (args, userId, userName) => {
  const approvalId = String(args.approvalId ?? '');
  if (!approvalId) return errorResponse('缺少参数: approvalId');
  const boundary = enforceHumanBoundary('approval_reject');
  if (boundary.requiresHuman && !args._humanConfirmed) {
    return textResponse({ requiresHumanConfirmation: true, reason: boundary.reason, message: '请确认后传入 _humanConfirmed: true' });
  }
  const result = await approvalService.processApproval(approvalId, userId, 'reject', args.comment ? String(args.comment) : undefined, userName);
  return textResponse({ message: '审批驳回', ...result });
};

/** Tool 14: approval_todos — 调用 approvalService.getApprovalTodos */
const approvalTodos: ToolFn = async (_args, userId) => {
  const todos = await approvalService.getApprovalTodos(userId);
  return textResponse({ message: `共 ${todos.length} 条待审批`, todos });
};

/** Tool 15: approval_reassign — 调用 approvalService.reassignApproval（V1 新增） */
const approvalReassign: ToolFn = async (args, userId, userName) => {
  const approvalId = String(args.approvalId ?? '');
  const newApproverId = String(args.newApproverId ?? '');
  if (!approvalId || !newApproverId) return errorResponse('缺少参数: approvalId, newApproverId');
  const result = await approvalService.reassignApproval(approvalId, userId, userName, newApproverId, args.reason ? String(args.reason) : undefined);
  return textResponse({ message: '审批已改派', ...result });
};

/** Tool 16: approval_batch — 调用 approvalService.batchApprove（V1 新增） */
const approvalBatch: ToolFn = async (args, userId, userName) => {
  const ids = args.approvalIds as string[] | undefined;
  if (!ids?.length) return errorResponse('缺少参数: approvalIds');
  const boundary = enforceHumanBoundary('approval_approve');
  if (boundary.requiresHuman && !args._humanConfirmed) {
    return textResponse({ requiresHumanConfirmation: true, reason: '批量审批需人工确认', message: `将批量通过 ${ids.length} 条审批，请确认后传入 _humanConfirmed: true` });
  }
  const result = await approvalService.batchApprove(ids, userId, userName, args.comment ? String(args.comment) : undefined);
  return textResponse({ message: `批量审批完成：${result.succeeded.length} 成功, ${result.failed.length} 失败`, ...result });
};

// ---------------------------------------------------------------------------
// Tool Registry
// ---------------------------------------------------------------------------

export const toolRegistry = new Map<string, ToolFn>([
  ['filing_create', filingCreate],
  ['filing_update', filingUpdate],
  ['filing_submit', filingSubmit],
  ['filing_recall', filingRecall],
  ['filing_get', filingGet],
  ['filing_list', filingList],
  ['filing_extract_from_doc', filingExtractFromDoc],
  ['filing_risk_assess', filingRiskAssess],
  ['filing_history', filingHistory],
  ['filing_stats', filingStats],
  ['filing_anomaly_detect', filingAnomalyDetect],
  ['approval_approve', approvalApprove],
  ['approval_reject', approvalReject],
  ['approval_todos', approvalTodos],
  ['approval_reassign', approvalReassign],
  ['approval_batch', approvalBatch],
]);

/** 工具定义列表（供 Synapse 发现） */
export const toolDefinitions = [
  { name: 'filing_create', description: '创建备案记录（草稿状态）', inputSchema: { type: 'object', required: ['type', 'title', 'projectName', 'domain', 'industry', 'amount'], properties: { type: { type: 'string', enum: ['direct_investment', 'earnout_change', 'fund_exit', 'legal_entity_setup', 'other_change'] }, title: { type: 'string' }, description: { type: 'string' }, projectName: { type: 'string' }, domain: { type: 'string', enum: ['smart_living', 'industrial_finance', 'health'] }, industry: { type: 'string' }, amount: { type: 'number', description: '金额（万元）' } } } },
  { name: 'filing_update', description: '更新备案内容（仅草稿可编辑）', inputSchema: { type: 'object', required: ['filingId'], properties: { filingId: { type: 'string' }, title: { type: 'string' }, amount: { type: 'number' } } } },
  { name: 'filing_submit', description: '提交备案进入审批（需人工确认）', inputSchema: { type: 'object', required: ['filingId'], properties: { filingId: { type: 'string' }, _humanConfirmed: { type: 'boolean' } } } },
  { name: 'filing_recall', description: '撤回已提交的备案（需人工确认）', inputSchema: { type: 'object', required: ['filingId'], properties: { filingId: { type: 'string' }, _humanConfirmed: { type: 'boolean' } } } },
  { name: 'filing_get', description: '获取备案详情', inputSchema: { type: 'object', required: ['filingId'], properties: { filingId: { type: 'string' } } } },
  { name: 'filing_list', description: '查询备案列表（支持筛选、分页）', inputSchema: { type: 'object', properties: { type: { type: 'string' }, status: { type: 'string' }, domain: { type: 'string' }, keyword: { type: 'string' }, page: { type: 'number' }, pageSize: { type: 'number' } } } },
  { name: 'filing_extract_from_doc', description: '从文档中提取备案信息（模拟）', inputSchema: { type: 'object', required: ['documentUrl'], properties: { documentUrl: { type: 'string' } } } },
  { name: 'filing_risk_assess', description: '评估备案风险等级（5因子透明模型）', inputSchema: { type: 'object', properties: { filingId: { type: 'string' }, amount: { type: 'number' }, type: { type: 'string' }, industry: { type: 'string' } } } },
  { name: 'filing_history', description: '获取项目/实体的历史备案记录', inputSchema: { type: 'object', properties: { projectName: { type: 'string' }, entityName: { type: 'string' }, filingId: { type: 'string' } } } },
  { name: 'filing_stats', description: '获取备案统计数据（按状态/类型/领域分布）', inputSchema: { type: 'object', properties: {} } },
  { name: 'filing_anomaly_detect', description: '检测备案异常模式（金额/频率异常）', inputSchema: { type: 'object', properties: { threshold: { type: 'number', description: '标准差倍数（默认2）' } } } },
  { name: 'approval_approve', description: '审批通过（需人工确认）', inputSchema: { type: 'object', required: ['approvalId'], properties: { approvalId: { type: 'string' }, comment: { type: 'string' }, _humanConfirmed: { type: 'boolean' } } } },
  { name: 'approval_reject', description: '审批驳回（需人工确认）', inputSchema: { type: 'object', required: ['approvalId'], properties: { approvalId: { type: 'string' }, comment: { type: 'string' }, _humanConfirmed: { type: 'boolean' } } } },
  { name: 'approval_todos', description: '获取当前用户的待审批列表', inputSchema: { type: 'object', properties: {} } },
  { name: 'approval_reassign', description: '管理员改派审批人', inputSchema: { type: 'object', required: ['approvalId', 'newApproverId'], properties: { approvalId: { type: 'string' }, newApproverId: { type: 'string' }, reason: { type: 'string' } } } },
  { name: 'approval_batch', description: '批量审批通过（需人工确认）', inputSchema: { type: 'object', required: ['approvalIds'], properties: { approvalIds: { type: 'array', items: { type: 'string' } }, comment: { type: 'string' }, _humanConfirmed: { type: 'boolean' } } } },
];

// ---------------------------------------------------------------------------
// Execution Pipeline: sanitize → permission → execute → validate → audit
// ---------------------------------------------------------------------------

export async function executeTool(
  name: string, args: ToolArgs, userId: string, userRole: string, userName: string,
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  // 1. 输入净化
  const inputStr = JSON.stringify(args);
  const { sanitized, threats } = sanitizeInput(inputStr);
  let sanitizedArgs = args;
  try { sanitizedArgs = JSON.parse(sanitized) as ToolArgs; } catch { /* keep original */ }
  if (threats.length > 0) {
    logSecurityEvent({ type: 'ai_input', userId, action: name, input: inputStr.substring(0, 500), sanitized: true, allowed: true, reason: `威胁: ${threats.join(', ')}` });
  }

  // 2. RBAC 权限
  const perm = checkPermission(userRole, name);
  logSecurityEvent({ type: 'permission_check', userId, action: name, sanitized: false, allowed: perm.allowed, reason: perm.reason });
  if (!perm.allowed) return errorResponse(`权限不足: ${perm.reason}`);

  // 3. 执行
  const toolFn = toolRegistry.get(name);
  if (!toolFn) return errorResponse(`未知工具: ${name}`);

  let response: MCPToolResponse;
  try {
    response = await toolFn(sanitizedArgs, userId, userName);
  } catch (err) {
    response = errorResponse(err instanceof Error ? err.message : '工具执行失败');
  }

  // 4. 输出校验
  const outputCheck = validateOutput(response);
  if (!outputCheck.valid) {
    logSecurityEvent({ type: 'ai_output', userId, action: name, output: JSON.stringify(response).substring(0, 500), sanitized: false, allowed: false, reason: `输出问题: ${outputCheck.issues.join(', ')}` });
  }

  // 5. 审计
  logSecurityEvent({ type: 'data_access', userId, action: name, input: inputStr.substring(0, 200), output: JSON.stringify(response).substring(0, 200), sanitized: threats.length > 0, allowed: true, reason: `耗时 ${Date.now() - startTime}ms` });

  return response;
}
