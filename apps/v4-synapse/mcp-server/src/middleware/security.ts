import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { users } from '@filing/database';
import type { SecurityAuditEntry } from '@filing/shared';
import { db } from '../lib/db.js';
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
  // 限制内存用量：保留最近 5000 条
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

  if (filters?.userId) {
    result = result.filter((e) => e.userId === filters.userId);
  }
  if (filters?.type) {
    result = result.filter((e) => e.type === filters.type);
  }
  if (filters?.action) {
    result = result.filter((e) => e.action === filters.action);
  }

  // 最新的在前
  result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const limit = filters?.limit ?? 100;
  return result.slice(0, limit);
}

// ---------------------------------------------------------------------------
// F4.1 — Input Sanitization (Prompt Injection Defense)
// ---------------------------------------------------------------------------

/** 已知 prompt injection 模式 */
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
  { pattern: /[-]{2,}|\/\*.*\*\//i, label: 'SQL 注释注入' },
];

/** 特殊字符阈值：字符串中特殊字符占比超过 40% 视为可疑 */
function hasExcessiveSpecialChars(input: string): boolean {
  if (input.length < 10) return false;
  const specialCount = (input.match(/[^\w\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef.,;:!?()（）、。，；：！？""''【】《》]/g) ?? []).length;
  return specialCount / input.length > 0.4;
}

export function sanitizeInput(input: string): { sanitized: string; threats: string[] } {
  const threats: string[] = [];

  // 检测注入模式
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(label);
    }
  }

  // 检测过量特殊字符
  if (hasExcessiveSpecialChars(input)) {
    threats.push('过量特殊字符');
  }

  // 清洗：移除 HTML 标签、转义危险字符
  let sanitized = input;
  sanitized = sanitized.replace(/<[^>]*>/g, '');                         // 移除 HTML 标签
  sanitized = sanitized.replace(/javascript\s*:/gi, '');                 // 移除 javascript: 协议
  sanitized = sanitized.replace(/on(load|error|click|mouseover)\s*=/gi, ''); // 移除事件处理器
  sanitized = sanitized.replace(/['";]\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi, ''); // 移除 SQL 注入片段
  sanitized = sanitized.replace(/;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)\s+/gi, '; '); // 中和破坏性 SQL

  return { sanitized, threats };
}

// ---------------------------------------------------------------------------
// F4.2 — Output Validation
// ---------------------------------------------------------------------------

/** 不允许出现在输出中的域名白名单之外的 URL 模式 */
const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'filing-platform.local',
];

/** 可能泄露的敏感模式 */
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /system\s*prompt\s*[:：]/i, label: '系统提示词泄露' },
  { pattern: /OPENAI_API_KEY|ANTHROPIC_API_KEY|API_KEY\s*[=:]/i, label: 'API 密钥泄露' },
  { pattern: /password\s*[:=]\s*['"][^'"]+['"]/i, label: '密码泄露' },
  { pattern: /\b\d{3}[-.]?\d{4}[-.]?\d{4}\b/, label: '手机号码泄露' },
  { pattern: /\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/, label: '身份证号泄露' },
];

export function validateOutput(output: unknown): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const text = typeof output === 'string' ? output : JSON.stringify(output);

  // 检查可自动执行的代码
  if (/<script[\s>]/i.test(text) || /eval\s*\(/i.test(text) || /Function\s*\(/i.test(text)) {
    issues.push('输出包含可执行代码');
  }

  // 检查外部 URL
  const urlMatches = text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  for (const url of urlMatches) {
    const isAllowed = ALLOWED_DOMAINS.some((d) => url.includes(d));
    if (!isAllowed) {
      issues.push(`输出包含外部链接: ${url.substring(0, 60)}...`);
    }
  }

  // 检查敏感数据泄露
  for (const { pattern, label } of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(label);
    }
  }

  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// F4.3 — Permission Guard (RBAC)
// ---------------------------------------------------------------------------

/** 角色 → 允许操作映射 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  initiator: [
    'filing_create', 'filing_update', 'filing_submit', 'filing_get', 'filing_list',
    'filing_extract_from_doc', 'filing_risk_assess', 'filing_history',
  ],
  supervisor: [
    'filing_get', 'filing_list', 'filing_history', 'filing_risk_assess',
    'filing_stats', 'approval_approve', 'approval_reject',
  ],
  group_approver: [
    'filing_get', 'filing_list', 'filing_history', 'filing_risk_assess',
    'filing_stats', 'filing_anomaly_detect',
    'approval_approve', 'approval_reject',
  ],
  viewer: [
    'filing_get', 'filing_list', 'filing_history', 'filing_stats',
    'filing_risk_assess', 'filing_anomaly_detect',
  ],
  admin: [
    'filing_create', 'filing_update', 'filing_submit', 'filing_get', 'filing_list',
    'filing_extract_from_doc', 'filing_risk_assess', 'filing_history',
    'filing_stats', 'filing_anomaly_detect', 'filing_delete',
    'approval_approve', 'approval_reject',
    'security_audit_log', 'security_check_input', 'security_check_permission',
  ],
};

export function checkPermission(
  userId: string,
  role: string,
  action: string,
  _resourceId?: string,
): { allowed: boolean; reason?: string } {
  const permissions = ROLE_PERMISSIONS[role];

  if (!permissions) {
    return { allowed: false, reason: `未知角色: ${role}` };
  }

  if (!permissions.includes(action)) {
    return { allowed: false, reason: `角色 ${role} 无权执行操作 ${action}` };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// F4.5 — Human-AI Boundary
// ---------------------------------------------------------------------------

/** 必须由人类确认的操作 */
const HUMAN_REQUIRED_ACTIONS: Record<string, string> = {
  filing_submit: '备案提交需人工确认',
  approval_approve: '审批通过需人工确认',
  approval_reject: '审批驳回需人工确认',
  filing_delete: '备案删除需人工确认',
};

export function enforceHumanBoundary(
  action: string,
): { requiresHuman: boolean; reason?: string } {
  const reason = HUMAN_REQUIRED_ACTIONS[action];
  if (reason) {
    return { requiresHuman: true, reason };
  }
  return { requiresHuman: false };
}

// ---------------------------------------------------------------------------
// F4.6 — Risk Assessment Transparency
// ---------------------------------------------------------------------------

/** 风险评估因子定义 */
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
  domain?: string;
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

  // 因子 1：金额规模
  let amountScore = 0;
  if (amount >= 100000) amountScore = 100;
  else if (amount >= 50000) amountScore = 70;
  else if (amount >= 10000) amountScore = 40;
  else amountScore = 10;
  factors.push({
    name: '投资金额规模',
    weight: 0.35,
    value: amountScore,
    source: 'filing.amount',
    description: `投资金额 ${amount} 万元`,
  });

  // 因子 2：备案类型
  const typeScores: Record<string, number> = {
    equity_direct: 60,
    fund_project: 50,
    fund_investment: 40,
    legal_entity: 30,
    other: 20,
  };
  const typeScore = typeScores[filingData.type ?? ''] ?? 30;
  factors.push({
    name: '备案类型风险',
    weight: 0.20,
    value: typeScore,
    source: 'filing.type',
    description: `备案类型: ${filingData.type ?? '未知'}`,
  });

  // 因子 3：行业风险
  const highRiskIndustries = ['房地产', '金融', '矿产', '虚拟货币', '博彩'];
  const industryScore = highRiskIndustries.some((i) => (filingData.industry ?? '').includes(i)) ? 80 : 20;
  factors.push({
    name: '行业风险',
    weight: 0.20,
    value: industryScore,
    source: 'filing.industry',
    description: `行业: ${filingData.industry ?? '未知'}`,
  });

  // 因子 4：投资比例
  const ratio = Number(filingData.investmentRatio ?? 0);
  let ratioScore = 0;
  if (ratio >= 51) ratioScore = 80;
  else if (ratio >= 30) ratioScore = 50;
  else ratioScore = 15;
  factors.push({
    name: '投资比例',
    weight: 0.15,
    value: ratioScore,
    source: 'filing.investmentRatio',
    description: `投资比例: ${ratio}%`,
  });

  // 因子 5：历史异常（PoC 简化：随机基线）
  const historyScore = 20;
  factors.push({
    name: '历史异常指标',
    weight: 0.10,
    value: historyScore,
    source: 'internal.history_baseline',
    description: '基于历史数据的异常基线评估',
  });

  // 加权总分
  const score = Math.round(
    factors.reduce((sum, f) => sum + f.weight * f.value, 0),
  );

  let riskLevel: 'low' | 'medium' | 'high';
  if (score >= 65) riskLevel = 'high';
  else if (score >= 35) riskLevel = 'medium';
  else riskLevel = 'low';

  return {
    riskLevel,
    score,
    factors,
    methodology: '加权评分模型 v1.0 — 基于金额规模、备案类型、行业风险、投资比例、历史异常五维度',
    confidence: 0.75,
  };
}

// ---------------------------------------------------------------------------
// Hono 安全中间件 — 对所有 POST/PUT 请求进行输入净化
// ---------------------------------------------------------------------------

type SecurityEnv = {
  Variables: {
    user: { id: string; role: string };
    sanitizedBody: unknown;
    inputThreats: string[];
  };
};

export const securityMiddleware = createMiddleware<SecurityEnv>(async (c, next) => {
  const method = c.req.method.toUpperCase();

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      const rawBody = await c.req.text();
      if (rawBody) {
        const { sanitized, threats } = sanitizeInput(rawBody);
        c.set('inputThreats', threats);

        if (threats.length > 0) {
          const userId = c.get('user')?.id ?? 'anonymous';
          logSecurityEvent({
            type: 'ai_input',
            userId,
            action: `${method} ${c.req.path}`,
            input: rawBody.substring(0, 500),
            sanitized: true,
            allowed: true,
            reason: `检测到威胁: ${threats.join(', ')}`,
          });
        }

        // 将净化后的内容设置到上下文（调用方可选使用）
        try {
          c.set('sanitizedBody', JSON.parse(sanitized));
        } catch {
          c.set('sanitizedBody', sanitized);
        }
      }
    } catch {
      // body 可能不是文本格式，跳过
    }
  }

  await next();
});
