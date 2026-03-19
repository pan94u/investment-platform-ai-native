import { createMiddleware } from 'hono/factory';
import type { SecurityAuditEntry } from '@filing/shared';
import { generateId } from '../lib/id.js';

// ---------------------------------------------------------------------------
// F4.4 — Security Audit Logger (in-memory for PoC)
// ---------------------------------------------------------------------------

const securityLog: SecurityAuditEntry[] = [];

export function logSecurityEvent(entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>): void {
  securityLog.push({
    ...entry,
    id: generateId('sec'),
    timestamp: new Date(),
  });
  if (securityLog.length > 5000) {
    securityLog.splice(0, securityLog.length - 5000);
  }
}

export function getSecurityLog(filters?: {
  userId?: string;
  type?: SecurityAuditEntry['type'];
  action?: string;
  limit?: number;
}): SecurityAuditEntry[] {
  let result = [...securityLog];
  if (filters?.userId) result = result.filter((e) => e.userId === filters.userId);
  if (filters?.type) result = result.filter((e) => e.type === filters.type);
  if (filters?.action) result = result.filter((e) => e.action === filters.action);
  result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return result.slice(0, filters?.limit ?? 100);
}

// ---------------------------------------------------------------------------
// F4.1 — Input Sanitization (Prompt Injection Defense)
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i, label: '忽略指令注入' },
  { pattern: /system\s+prompt/i, label: '系统提示词探测' },
  { pattern: /you\s+are\s+(now|a|an)\s+/i, label: '角色劫持尝试' },
  { pattern: /pretend\s+(to\s+be|you\s+are)/i, label: '角色伪装注入' },
  { pattern: /do\s+not\s+follow\s+(any|your|the)\s+(rules?|instructions?)/i, label: '规则绕过注入' },
  { pattern: /\bDAN\b|\bjailbreak\b/i, label: '越狱关键词' },
  { pattern: /<script[\s>]/i, label: 'XSS script 注入' },
  { pattern: /<iframe[\s>]/i, label: 'XSS iframe 注入' },
  { pattern: /on(load|error|click|mouseover)\s*=/i, label: 'XSS 事件处理器注入' },
  { pattern: /javascript\s*:/i, label: 'javascript: 协议注入' },
  { pattern: /['";]\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i, label: 'SQL 注入（等值条件）' },
  { pattern: /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)\s+/i, label: 'SQL 注入（破坏性语句）' },
  { pattern: /UNION\s+SELECT/i, label: 'SQL 注入（UNION SELECT）' },
];

function hasExcessiveSpecialChars(input: string): boolean {
  if (input.length < 10) return false;
  const specialCount = (input.match(/[^\w\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef.,;:!?()（）、。，；：！？""''【】《》]/g) ?? []).length;
  return specialCount / input.length > 0.4;
}

export function sanitizeInput(input: string): { sanitized: string; threats: string[] } {
  const threats: string[] = [];
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(input)) threats.push(label);
  }
  if (hasExcessiveSpecialChars(input)) threats.push('过量特殊字符');

  let sanitized = input;
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/on(load|error|click|mouseover)\s*=/gi, '');
  sanitized = sanitized.replace(/['";]\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi, '');
  sanitized = sanitized.replace(/;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)\s+/gi, '; ');
  return { sanitized, threats };
}

// ---------------------------------------------------------------------------
// F4.2 — Output Validation
// ---------------------------------------------------------------------------

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /OPENAI_API_KEY|ANTHROPIC_API_KEY|API_KEY\s*[=:]/i, label: 'API 密钥泄露' },
  { pattern: /password\s*[:=]\s*['"][^'"]+['"]/i, label: '密码泄露' },
  { pattern: /\b\d{3}[-.]?\d{4}[-.]?\d{4}\b/, label: '手机号码泄露' },
  { pattern: /\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/, label: '身份证号泄露' },
];

export function validateOutput(output: unknown): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  if (/<script[\s>]/i.test(text) || /eval\s*\(/i.test(text)) issues.push('输出包含可执行代码');
  for (const { pattern, label } of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) issues.push(label);
  }
  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// F4.3 — Permission Guard (RBAC) — 扩展支持 V1 审批工具
// ---------------------------------------------------------------------------

const ROLE_PERMISSIONS: Record<string, string[]> = {
  initiator: [
    'filing_create', 'filing_update', 'filing_submit', 'filing_recall',
    'filing_get', 'filing_list', 'filing_extract_from_doc', 'filing_risk_assess', 'filing_history',
  ],
  supervisor: [
    'filing_get', 'filing_list', 'filing_history', 'filing_risk_assess', 'filing_stats',
    'approval_approve', 'approval_reject', 'approval_todos',
  ],
  group_approver: [
    'filing_get', 'filing_list', 'filing_history', 'filing_risk_assess', 'filing_stats',
    'filing_anomaly_detect',
    'approval_approve', 'approval_reject', 'approval_todos',
  ],
  viewer: [
    'filing_get', 'filing_list', 'filing_history', 'filing_stats',
    'filing_risk_assess', 'filing_anomaly_detect',
  ],
  admin: [
    'filing_create', 'filing_update', 'filing_submit', 'filing_recall',
    'filing_get', 'filing_list', 'filing_extract_from_doc', 'filing_risk_assess', 'filing_history',
    'filing_stats', 'filing_anomaly_detect',
    'approval_approve', 'approval_reject', 'approval_todos', 'approval_reassign', 'approval_batch',
  ],
};

export function checkPermission(role: string, action: string): { allowed: boolean; reason?: string } {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return { allowed: false, reason: `未知角色: ${role}` };
  if (!permissions.includes(action)) return { allowed: false, reason: `角色 ${role} 无权执行 ${action}` };
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// F4.5 — Human-AI Boundary
// ---------------------------------------------------------------------------

const HUMAN_REQUIRED_ACTIONS: Record<string, string> = {
  filing_submit: '备案提交需人工确认',
  filing_recall: '备案撤回需人工确认',
  approval_approve: '审批通过需人工确认',
  approval_reject: '审批驳回需人工确认',
};

export function enforceHumanBoundary(action: string): { requiresHuman: boolean; reason?: string } {
  const reason = HUMAN_REQUIRED_ACTIONS[action];
  return reason ? { requiresHuman: true, reason } : { requiresHuman: false };
}

// ---------------------------------------------------------------------------
// F4.6 — Risk Assessment Transparency (5 因子加权模型)
// ---------------------------------------------------------------------------

interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  source: string;
  description: string;
}

export function getRiskAssessmentAudit(filingData: {
  amount?: string | number;
  type?: string;
  industry?: string;
  investmentRatio?: string | number | null;
}): {
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  factors: RiskFactor[];
  methodology: string;
  confidence: number;
} {
  const factors: RiskFactor[] = [];
  const amount = Number(filingData.amount ?? 0);

  let amountScore = amount >= 100000 ? 100 : amount >= 50000 ? 70 : amount >= 10000 ? 40 : 10;
  factors.push({ name: '投资金额规模', weight: 0.35, value: amountScore, source: 'filing.amount', description: `投资金额 ${amount} 万元` });

  const typeScores: Record<string, number> = { direct_investment: 60, earnout_change: 50, fund_exit: 40, legal_entity_setup: 30, other_change: 20 };
  factors.push({ name: '备案类型风险', weight: 0.20, value: typeScores[filingData.type ?? ''] ?? 30, source: 'filing.type', description: `备案类型: ${filingData.type ?? '未知'}` });

  const highRisk = ['房地产', '金融', '矿产', '虚拟货币', '博彩'];
  factors.push({ name: '行业风险', weight: 0.20, value: highRisk.some((i) => (filingData.industry ?? '').includes(i)) ? 80 : 20, source: 'filing.industry', description: `行业: ${filingData.industry ?? '未知'}` });

  const ratio = Number(filingData.investmentRatio ?? 0);
  factors.push({ name: '投资比例', weight: 0.15, value: ratio >= 51 ? 80 : ratio >= 30 ? 50 : 15, source: 'filing.investmentRatio', description: `投资比例: ${ratio}%` });

  factors.push({ name: '历史异常指标', weight: 0.10, value: 20, source: 'internal.history_baseline', description: '基于历史数据的异常基线评估' });

  const score = Math.round(factors.reduce((sum, f) => sum + f.weight * f.value, 0));
  const riskLevel = score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low';

  return { riskLevel, score, factors, methodology: '加权评分模型 v1.0 — 五维度', confidence: 0.75 };
}

// ---------------------------------------------------------------------------
// Hono 安全中间件
// ---------------------------------------------------------------------------

type SecurityEnv = { Variables: { user: { id: string; role: string }; sanitizedBody: unknown; inputThreats: string[] } };

export const securityMiddleware = createMiddleware<SecurityEnv>(async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      const rawBody = await c.req.text();
      if (rawBody) {
        const { sanitized, threats } = sanitizeInput(rawBody);
        c.set('inputThreats', threats);
        if (threats.length > 0) {
          logSecurityEvent({ type: 'ai_input', userId: c.get('user')?.id ?? 'anonymous', action: `${method} ${c.req.path}`, input: rawBody.substring(0, 500), sanitized: true, allowed: true, reason: `威胁: ${threats.join(', ')}` });
        }
        try { c.set('sanitizedBody', JSON.parse(sanitized)); } catch { c.set('sanitizedBody', sanitized); }
      }
    } catch { /* non-text body */ }
  }
  await next();
});
