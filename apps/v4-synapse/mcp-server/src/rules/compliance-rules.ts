import type { ComplianceCheckResult, ComplianceViolation } from '@filing/shared';
import { getRiskAssessmentAudit, logSecurityEvent } from '../middleware/security.js';

// ---------------------------------------------------------------------------
// Pre-Hook Rules — 执行前校验
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
  valuationAmount?: string | number | null;
}

/**
 * 规则 1: filing-required-fields
 * 必填字段校验
 */
function checkRequiredFields(data: FilingData): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const required: Array<{ field: keyof FilingData; label: string }> = [
    { field: 'projectName', label: '项目名称' },
    { field: 'description', label: '项目描述' },
    { field: 'amount', label: '投资金额' },
    { field: 'type', label: '备案类型' },
  ];

  for (const { field, label } of required) {
    if (!data[field] && data[field] !== 0) {
      violations.push({
        ruleId: 'filing-required-fields',
        ruleName: '必填字段校验',
        field,
        message: `${label} 为必填项`,
        severity: 'error',
      });
    }
  }

  return violations;
}

/**
 * 规则 2: filing-amount-validation
 * 金额上限校验：基金投资 >= 100000万 (100亿) 拦截
 */
function checkAmountValidation(data: FilingData): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const amount = Number(data.amount ?? 0);

  if (amount <= 0) {
    violations.push({
      ruleId: 'filing-amount-validation',
      ruleName: '金额合法性校验',
      field: 'amount',
      message: '投资金额必须大于 0',
      severity: 'error',
    });
  }

  // 基金投退出金额上限：100000万（100亿）
  if (data.type === 'fund_exit' && amount >= 100000) {
    violations.push({
      ruleId: 'filing-amount-validation',
      ruleName: '金额上限校验',
      field: 'amount',
      message: `基金投退出金额 ${amount} 万元超出上限（100000万 / 100亿），需走特别审批流程`,
      severity: 'error',
    });
  }

  // 对所有类型的超大金额发出警告
  if (amount >= 50000) {
    violations.push({
      ruleId: 'filing-amount-validation',
      ruleName: '大额投资预警',
      field: 'amount',
      message: `投资金额 ${amount} 万元为大额投资（≥5亿），请确认金额准确性`,
      severity: 'warning',
    });
  }

  return violations;
}

/**
 * 规则 3: filing-risk-driven-approval
 * 根据风险等级确定审批链
 */
function checkRiskDrivenApproval(data: FilingData): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  const riskAudit = getRiskAssessmentAudit({
    amount: data.amount,
    type: data.type,
    domain: data.domain,
    industry: data.industry,
    investmentRatio: data.investmentRatio,
  });

  if (riskAudit.riskLevel === 'high') {
    violations.push({
      ruleId: 'filing-risk-driven-approval',
      ruleName: '高风险审批升级',
      message: `风险评分 ${riskAudit.score}（${riskAudit.riskLevel}），需启动三级审批流程（额外需分管领导审批）`,
      severity: 'warning',
    });
  }

  return violations;
}

/**
 * 执行所有 Pre-Hook 规则
 */
export function runPreHooks(action: string, data: FilingData): ComplianceCheckResult {
  const allViolations: ComplianceViolation[] = [];

  if (action === 'filing_create' || action === 'filing_submit') {
    allViolations.push(...checkRequiredFields(data));
    allViolations.push(...checkAmountValidation(data));
    allViolations.push(...checkRiskDrivenApproval(data));
  }

  if (action === 'filing_update') {
    // 更新时只校验涉及的字段
    if (data.amount !== undefined) {
      allViolations.push(...checkAmountValidation(data));
    }
  }

  const errors = allViolations.filter((v) => v.severity === 'error');
  const warnings = allViolations.filter((v) => v.severity === 'warning');

  return {
    passed: errors.length === 0,
    violations: errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Post-Hook Rules — 执行后处理
// ---------------------------------------------------------------------------

/**
 * Post-Hook 1: filing-post-sync
 * 审批通过后模拟同步到外部系统（Invest/Legal）
 */
function postSync(action: string, data: Record<string, unknown>): void {
  if (action === 'approval_approve') {
    console.log(`[Post-Hook] filing-post-sync: 同步备案 ${data.filingId ?? 'unknown'} 到投资管理系统`);
    console.log(`[Post-Hook] filing-post-sync: 同步备案 ${data.filingId ?? 'unknown'} 到法务合规系统`);

    logSecurityEvent({
      type: 'data_access',
      userId: String(data.userId ?? 'system'),
      action: 'post_sync',
      output: `同步到 Invest/Legal 系统完成（模拟）`,
      sanitized: false,
      allowed: true,
      reason: '审批通过后的自动同步',
    });
  }
}

/**
 * Post-Hook 2: filing-audit-snapshot
 * 捕获审批上下文快照
 */
function auditSnapshot(action: string, data: Record<string, unknown>): void {
  if (action === 'approval_approve' || action === 'approval_reject') {
    const snapshot = {
      action,
      filingId: data.filingId,
      approverId: data.userId,
      timestamp: new Date().toISOString(),
      context: {
        approvalLevel: data.level,
        comment: data.comment,
        riskLevel: data.riskLevel,
      },
    };
    console.log(`[Post-Hook] filing-audit-snapshot:`, JSON.stringify(snapshot));

    logSecurityEvent({
      type: 'data_access',
      userId: String(data.userId ?? 'system'),
      action: 'audit_snapshot',
      output: JSON.stringify(snapshot).substring(0, 500),
      sanitized: false,
      allowed: true,
      reason: '审批上下文快照',
    });
  }
}

/**
 * 执行所有 Post-Hook 规则
 */
export function runPostHooks(action: string, data: Record<string, unknown>): void {
  try {
    postSync(action, data);
    auditSnapshot(action, data);
  } catch (err) {
    console.error('[Post-Hook] 执行失败:', err);
  }
}
