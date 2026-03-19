import type { ComplianceCheckResult, ComplianceViolation } from '@filing/shared';
import { getRiskAssessmentAudit, logSecurityEvent } from './security.js';

// ---------------------------------------------------------------------------
// Pre-Hook Rules
// ---------------------------------------------------------------------------

interface FilingData {
  type?: string;
  title?: string;
  description?: string;
  projectName?: string;
  domain?: string;
  industry?: string;
  amount?: string | number;
  investmentRatio?: string | number | null;
}

function checkRequiredFields(data: FilingData): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const required: Array<{ field: keyof FilingData; label: string }> = [
    { field: 'projectName', label: '项目名称' },
    { field: 'amount', label: '投资金额' },
    { field: 'type', label: '备案类型' },
  ];
  for (const { field, label } of required) {
    if (!data[field] && data[field] !== 0) {
      violations.push({ ruleId: 'filing-required-fields', ruleName: '必填字段校验', field, message: `${label} 为必填项`, severity: 'error' });
    }
  }
  return violations;
}

function checkAmountValidation(data: FilingData): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const amount = Number(data.amount ?? 0);
  if (amount <= 0) {
    violations.push({ ruleId: 'filing-amount-validation', ruleName: '金额合法性校验', field: 'amount', message: '投资金额必须大于 0', severity: 'error' });
  }
  if (data.type === 'fund_exit' && amount >= 100000) {
    violations.push({ ruleId: 'filing-amount-validation', ruleName: '金额上限校验', field: 'amount', message: `基金退出金额 ${amount} 万元超出上限（100亿），需走特别审批`, severity: 'error' });
  }
  if (amount >= 50000) {
    violations.push({ ruleId: 'filing-amount-validation', ruleName: '大额投资预警', field: 'amount', message: `投资金额 ${amount} 万元为大额投资（≥5亿），请确认`, severity: 'warning' });
  }
  return violations;
}

function checkRiskDrivenApproval(data: FilingData): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const risk = getRiskAssessmentAudit({ amount: data.amount, type: data.type, industry: data.industry, investmentRatio: data.investmentRatio });
  if (risk.riskLevel === 'high') {
    violations.push({ ruleId: 'filing-risk-driven-approval', ruleName: '高风险审批升级', message: `风险评分 ${risk.score}（${risk.riskLevel}），建议启动加强审批`, severity: 'warning' });
  }
  return violations;
}

export function runPreHooks(action: string, data: FilingData): ComplianceCheckResult {
  const all: ComplianceViolation[] = [];
  if (action === 'filing_create') {
    // 创建时校验必填字段 + 金额 + 风险
    all.push(...checkRequiredFields(data), ...checkAmountValidation(data), ...checkRiskDrivenApproval(data));
  }
  if (action === 'filing_submit') {
    // 提交时只传 filingId，字段已在创建时校验，仅做金额/风险检查（如果参数中包含）
    if (data.amount !== undefined) {
      all.push(...checkAmountValidation(data), ...checkRiskDrivenApproval(data));
    }
  }
  if (action === 'filing_update' && data.amount !== undefined) {
    all.push(...checkAmountValidation(data));
  }
  const errors = all.filter((v) => v.severity === 'error');
  const warnings = all.filter((v) => v.severity === 'warning');
  return { passed: errors.length === 0, violations: errors, warnings };
}

// ---------------------------------------------------------------------------
// Post-Hook Rules
// ---------------------------------------------------------------------------

export function runPostHooks(action: string, data: Record<string, unknown>): void {
  try {
    if (action === 'approval_approve') {
      logSecurityEvent({ type: 'data_access', userId: String(data.userId ?? 'system'), action: 'post_sync', output: `同步备案 ${data.filingId} 到外部系统（模拟）`, sanitized: false, allowed: true, reason: '审批通过后自动同步' });
    }
    if (action === 'approval_approve' || action === 'approval_reject') {
      logSecurityEvent({ type: 'data_access', userId: String(data.userId ?? 'system'), action: 'audit_snapshot', output: JSON.stringify({ action, filingId: data.filingId, timestamp: new Date().toISOString() }).substring(0, 500), sanitized: false, allowed: true, reason: '审批上下文快照' });
    }
  } catch (err) {
    console.error('[Post-Hook] 执行失败:', err);
  }
}
