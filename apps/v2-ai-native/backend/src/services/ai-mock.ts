/**
 * Mock AI Service — 模拟 AI 响应用于 PoC 演示
 *
 * 所有函数均为确定性 mock，通过关键词匹配产生逼真的 AI 风格输出。
 * 真实实现会调用 LLM API（Claude / GPT），但 PoC 阶段用 mock 验证交互体验。
 */

import type {
  AIPrefillResult,
  DocumentExtraction,
  RiskAssessment,
  ApprovalSummary,
  FieldSource,
  RiskFactor,
  HistoricalItem,
} from '@filing/shared';

// ─── 预填充（对话式建单核心能力） ─────────────────────────────────

/**
 * 根据自然语言描述，生成备案预填充字段
 * 真实实现：LLM 解析意图 + 调用内部系统获取上下文
 */
export function generatePrefill(userMessage: string, projectName?: string): AIPrefillResult {
  const msg = userMessage.toLowerCase();

  // 场景1: 对赌变更 — 关键词 "对赌" / "业绩承诺"
  if (msg.includes('对赌') || msg.includes('业绩承诺')) {
    const project = extractProjectName(msg) || projectName || '海川项目';
    const isHaichuan = project.includes('海川');
    return {
      fields: {
        type: 'earnout_change',
        title: `${project}对赌目标调整备案`,
        description: isHaichuan
          ? '因市场环境变化及行业周期影响，海川项目原对赌业绩目标需进行合理调整，拟将2026年净利润目标从8000万元下调至6500万元。'
          : `${project}对赌条件变更，需提交备案审批。`,
        projectName: project,
        domain: isHaichuan ? 'smart_living' as const : 'industrial_finance' as const,
        industry: isHaichuan ? '住居科技' : '金融投资',
        amount: isHaichuan ? 6500 : 5000,
        currency: 'CNY',
        originalTarget: isHaichuan ? 8000 : 6000,
        newTarget: isHaichuan ? 6500 : 5000,
        changeReason: extractChangeReason(msg) || '市场环境变化，原对赌目标需合理调整',
      },
      fieldSources: {
        type: makeSource('type', 'ai_prefill', 0.95, '从用户描述"对赌"推断为对赌变更'),
        title: makeSource('title', 'ai_prefill', 0.9, '根据项目名 + 场景自动生成'),
        description: makeSource('description', 'ai_prefill', 0.85, 'AI 根据上下文生成描述'),
        projectName: makeSource('projectName', 'ai_prefill', isHaichuan ? 0.95 : 0.8, '从用户输入提取项目名称'),
        domain: makeSource('domain', 'system_auto', 0.99, '从战投系统匹配项目所属领域'),
        industry: makeSource('industry', 'system_auto', 0.99, '从战投系统匹配行业'),
        amount: makeSource('amount', 'ai_prefill', 0.7, '从上下文推断金额，建议用户确认'),
        originalTarget: makeSource('originalTarget', 'system_auto', 0.95, '从历史备案记录中获取原对赌目标'),
        newTarget: makeSource('newTarget', 'ai_prefill', 0.75, '从用户描述中提取新目标'),
        changeReason: makeSource('changeReason', 'ai_prefill', 0.85, 'AI 根据对话内容总结变更原因'),
      },
      confidence: 0.87,
      explanation: `我理解您需要为「${project}」提交一个对赌变更备案。我已根据历史记录和您的描述预填了大部分字段，请确认金额和变更原因是否准确。`,
    };
  }

  // 场景2: 法人新设 — 关键词 "新设" / "法人" / "成立"
  if (msg.includes('新设') || msg.includes('法人') || msg.includes('成立公司') || msg.includes('设立')) {
    const project = extractProjectName(msg) || projectName || '创新科技项目';
    return {
      fields: {
        type: 'legal_entity_setup',
        title: `${project}法人主体新设备案`,
        description: `拟为${project}新设项目法人主体，用于承接后续投资运营及合规管理需要。`,
        projectName: project,
        domain: 'smart_living' as const,
        industry: '住居科技',
        amount: 1000,
        currency: 'CNY',
        legalEntityName: `${project.replace('项目', '')}科技有限公司`,
      },
      fieldSources: {
        type: makeSource('type', 'ai_prefill', 0.95, '从"新设/法人"关键词推断'),
        title: makeSource('title', 'ai_prefill', 0.9, '根据项目名 + 场景生成'),
        description: makeSource('description', 'ai_prefill', 0.85, 'AI 生成标准描述'),
        projectName: makeSource('projectName', 'ai_prefill', 0.85, '从对话中提取'),
        domain: makeSource('domain', 'ai_prefill', 0.7, '需用户确认所属领域'),
        industry: makeSource('industry', 'ai_prefill', 0.7, '需用户确认行业分类'),
        amount: makeSource('amount', 'ai_prefill', 0.6, '注册资本需用户填写，当前为默认值'),
        legalEntityName: makeSource('legalEntityName', 'ai_prefill', 0.75, 'AI 根据项目名建议公司名'),
      },
      confidence: 0.78,
      explanation: `我理解您需要为「${project}」新设法人主体。注册资本和法人名称需要您确认，其余字段已自动填充。`,
    };
  }

  // 场景3: 直投 — 关键词 "投资" / "直投" / "入股"
  if (msg.includes('投资') || msg.includes('直投') || msg.includes('入股') || msg.includes('注资')) {
    const project = extractProjectName(msg) || projectName || '瑞丰项目';
    const amount = extractAmount(msg) || 30000;
    return {
      fields: {
        type: 'direct_investment',
        title: `${project}直接投资备案`,
        description: `拟对${project}进行直接股权投资，投资金额${amount}万元。`,
        projectName: project,
        domain: 'industrial_finance' as const,
        industry: '金融投资',
        amount,
        currency: 'CNY',
        investmentRatio: 15,
        valuationAmount: amount * 5,
      },
      fieldSources: {
        type: makeSource('type', 'ai_prefill', 0.92, '从"投资/直投"推断为直接投资'),
        title: makeSource('title', 'ai_prefill', 0.9, '根据项目名 + 场景生成'),
        description: makeSource('description', 'ai_prefill', 0.85, 'AI 根据上下文生成'),
        projectName: makeSource('projectName', 'ai_prefill', 0.85, '从对话中提取项目名'),
        domain: makeSource('domain', 'ai_prefill', 0.7, '需确认投资领域'),
        industry: makeSource('industry', 'ai_prefill', 0.7, '需确认行业分类'),
        amount: makeSource('amount', 'ai_prefill', 0.8, '从对话中提取投资金额'),
        investmentRatio: makeSource('investmentRatio', 'ai_prefill', 0.5, '投资比例需用户确认'),
        valuationAmount: makeSource('valuationAmount', 'ai_prefill', 0.5, '估值需用户确认'),
      },
      confidence: 0.82,
      explanation: `我理解您需要为「${project}」提交一个直接投资备案，投资金额约 ${amount} 万元。投资比例和估值为估算值，请您核实。`,
    };
  }

  // 场景4: 基金退出 — 关键词 "退出" / "减持" / "清算"
  if (msg.includes('退出') || msg.includes('减持') || msg.includes('清算')) {
    const project = extractProjectName(msg) || projectName || '星辰基金';
    return {
      fields: {
        type: 'fund_exit',
        title: `${project}退出备案`,
        description: `${project}拟进行投资退出操作，需提交备案审批。`,
        projectName: project,
        domain: 'industrial_finance' as const,
        industry: '金融投资',
        amount: 20000,
        currency: 'CNY',
      },
      fieldSources: {
        type: makeSource('type', 'ai_prefill', 0.93, '从"退出/减持"推断为基金投退出'),
        title: makeSource('title', 'ai_prefill', 0.9, '根据项目名 + 场景生成'),
        description: makeSource('description', 'ai_prefill', 0.8, 'AI 生成描述'),
        projectName: makeSource('projectName', 'ai_prefill', 0.85, '从对话中提取'),
        domain: makeSource('domain', 'ai_prefill', 0.75, '需确认领域'),
        industry: makeSource('industry', 'ai_prefill', 0.75, '需确认行业'),
        amount: makeSource('amount', 'ai_prefill', 0.6, '退出金额需用户填写'),
      },
      confidence: 0.80,
      explanation: `我理解您需要为「${project}」提交退出备案。退出金额和方式需要您进一步确认。`,
    };
  }

  // 默认场景: 其他变更
  const project = extractProjectName(msg) || projectName || '待确认项目';
  return {
    fields: {
      type: 'other_change',
      title: `${project}投资要素变更备案`,
      description: userMessage,
      projectName: project,
      domain: 'smart_living' as const,
      industry: '待确认',
      amount: 0,
      currency: 'CNY',
    },
    fieldSources: {
      type: makeSource('type', 'ai_prefill', 0.5, '未能明确判断场景类型，默认为其他变更'),
      title: makeSource('title', 'ai_prefill', 0.6, '根据输入生成标题'),
      description: makeSource('description', 'user_input', 1.0, '使用用户原始输入'),
      projectName: makeSource('projectName', 'ai_prefill', 0.5, '请确认项目名称'),
      domain: makeSource('domain', 'ai_prefill', 0.3, '需用户指定领域'),
      industry: makeSource('industry', 'ai_prefill', 0.3, '需用户指定行业'),
      amount: makeSource('amount', 'ai_prefill', 0.1, '需用户填写金额'),
    },
    confidence: 0.45,
    explanation: '我尚未完全理解您的需求，已按「其他投资要素变更」预填。请补充项目名称、变更类型和金额等信息，我会重新帮您整理。',
  };
}

// ─── 文档提取 ─────────────────────────────────────────────────

/**
 * 模拟从上传文档中提取结构化信息
 * 真实实现：OCR/PDF解析 + LLM 结构化提取
 */
export function extractFromDocument(filename: string, content?: string): DocumentExtraction {
  const lower = filename.toLowerCase();

  // 投资协议类文档
  if (lower.includes('投资') || lower.includes('agreement') || lower.includes('协议')) {
    return {
      filename,
      extractedFields: {
        type: 'direct_investment',
        projectName: '海川项目',
        amount: 35000,
        investmentRatio: 20,
        valuationAmount: 175000,
        industry: '住居科技',
        domain: 'smart_living',
      },
      fieldSources: {
        projectName: makeSource('projectName', 'doc_extract', 0.95, '从协议甲方名称提取'),
        amount: makeSource('amount', 'doc_extract', 0.98, '从协议第三条投资金额提取'),
        investmentRatio: makeSource('investmentRatio', 'doc_extract', 0.95, '从协议第四条股权比例提取'),
        valuationAmount: makeSource('valuationAmount', 'doc_extract', 0.92, '从协议估值条款计算'),
      },
      summary: '该文档为股权投资协议，涉及海川项目直接投资，投资金额3.5亿元（35000万元），占股20%，投前估值17.5亿元。',
      pageCount: 12,
      confidence: 0.93,
    };
  }

  // 对赌相关文档
  if (lower.includes('对赌') || lower.includes('业绩承诺') || lower.includes('补充协议')) {
    return {
      filename,
      extractedFields: {
        type: 'earnout_change',
        projectName: '海川项目',
        originalTarget: 8000,
        newTarget: 6500,
        changeReason: '受宏观经济环境及行业周期影响，原业绩承诺目标需合理调整',
        amount: 6500,
      },
      fieldSources: {
        projectName: makeSource('projectName', 'doc_extract', 0.95, '从文档标题提取项目名'),
        originalTarget: makeSource('originalTarget', 'doc_extract', 0.98, '从原协议条款提取'),
        newTarget: makeSource('newTarget', 'doc_extract', 0.97, '从变更条款提取'),
        changeReason: makeSource('changeReason', 'doc_extract', 0.9, '从变更说明段落提取'),
      },
      summary: '该文档为对赌协议补充协议，将海川项目2026年净利润目标从8000万元调整为6500万元，主要原因为市场环境变化。',
      pageCount: 5,
      confidence: 0.91,
    };
  }

  // 法人设立相关文档
  if (lower.includes('章程') || lower.includes('设立') || lower.includes('公司')) {
    return {
      filename,
      extractedFields: {
        type: 'legal_entity_setup',
        legalEntityName: '海川智居科技有限公司',
        projectName: '海川项目',
        amount: 5000,
        domain: 'smart_living',
        industry: '住居科技',
      },
      fieldSources: {
        legalEntityName: makeSource('legalEntityName', 'doc_extract', 0.98, '从公司章程提取'),
        amount: makeSource('amount', 'doc_extract', 0.95, '从注册资本条款提取'),
      },
      summary: '该文档为公司章程，拟设立海川智居科技有限公司，注册资本5000万元。',
      pageCount: 8,
      confidence: 0.90,
    };
  }

  // 默认: 无法识别
  return {
    filename,
    extractedFields: {},
    fieldSources: {},
    summary: `已接收文件「${filename}」，但未能自动提取结构化信息。请手动填写备案字段，或上传标准格式的投资协议/补充协议。`,
    pageCount: 1,
    confidence: 0.2,
  };
}

// ─── 风险评估 ─────────────────────────────────────────────────

/**
 * 评估备案风险等级
 * 真实实现：规则引擎 + ML 模型 + 外部数据
 */
export function assessRisk(filing: any, history?: any[]): RiskAssessment {
  const factors: RiskFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  const amount = Number(filing.amount) || 0;

  // 因子1: 金额维度
  const amountWeight = 30;
  totalWeight += amountWeight;
  if (amount > 50000) {
    factors.push({
      dimension: '投资金额',
      signal: 'high',
      value: `${amount} 万元`,
      description: '投资金额超过5亿元，属于重大投资事项，需集团重点审查',
      weight: amountWeight,
    });
    totalScore += amountWeight * 0.9;
  } else if (amount > 10000) {
    factors.push({
      dimension: '投资金额',
      signal: 'medium',
      value: `${amount} 万元`,
      description: '投资金额在1-5亿元区间，需常规审查',
      weight: amountWeight,
    });
    totalScore += amountWeight * 0.5;
  } else {
    factors.push({
      dimension: '投资金额',
      signal: 'low',
      value: `${amount} 万元`,
      description: '投资金额在1亿元以下，风险可控',
      weight: amountWeight,
    });
    totalScore += amountWeight * 0.15;
  }

  // 因子2: 场景类型
  const typeWeight = 20;
  totalWeight += typeWeight;
  if (filing.type === 'earnout_change') {
    factors.push({
      dimension: '场景类型',
      signal: 'medium',
      value: '对赌变更',
      description: '对赌变更涉及业绩承诺调整，需关注合理性和历史频次',
      weight: typeWeight,
    });
    totalScore += typeWeight * 0.6;
  } else if (filing.type === 'fund_exit') {
    factors.push({
      dimension: '场景类型',
      signal: 'medium',
      value: '基金投退出',
      description: '退出操作涉及资产处置，需评估时机和回报',
      weight: typeWeight,
    });
    totalScore += typeWeight * 0.5;
  } else if (filing.type === 'direct_investment') {
    factors.push({
      dimension: '场景类型',
      signal: amount > 30000 ? 'high' : 'low',
      value: '直投投资',
      description: amount > 30000
        ? '大额直投需特别关注估值合理性与投资回报'
        : '直投投资，常规备案流程',
      weight: typeWeight,
    });
    totalScore += typeWeight * (amount > 30000 ? 0.7 : 0.2);
  } else {
    factors.push({
      dimension: '场景类型',
      signal: 'low',
      value: filing.type,
      description: '常规备案类型，风险较低',
      weight: typeWeight,
    });
    totalScore += typeWeight * 0.15;
  }

  // 因子3: 历史频次（对赌变更特有）
  const historyWeight = 20;
  totalWeight += historyWeight;
  const earnoutCount = (history || []).filter((h: any) => h.type === 'earnout_change').length;
  if (filing.type === 'earnout_change' && earnoutCount >= 2) {
    factors.push({
      dimension: '历史频次',
      signal: 'high',
      value: `该项目已有 ${earnoutCount} 次对赌变更`,
      description: '同一项目多次对赌变更，需重点关注底层资产质量和管理层履约能力',
      weight: historyWeight,
    });
    totalScore += historyWeight * 0.85;
  } else if (earnoutCount === 1) {
    factors.push({
      dimension: '历史频次',
      signal: 'medium',
      value: '该项目有 1 次历史对赌变更',
      description: '存在前序对赌变更记录，需对比前后变更幅度',
      weight: historyWeight,
    });
    totalScore += historyWeight * 0.5;
  } else {
    factors.push({
      dimension: '历史频次',
      signal: 'low',
      value: '无同类历史记录',
      description: '无历史变更记录，属于首次备案',
      weight: historyWeight,
    });
    totalScore += historyWeight * 0.1;
  }

  // 因子4: 估值合理性（直投特有）
  const valuationWeight = 15;
  totalWeight += valuationWeight;
  if (filing.type === 'direct_investment' && filing.valuationAmount) {
    const valuation = Number(filing.valuationAmount);
    const ratio = Number(filing.investmentRatio) || 1;
    const impliedValuation = (amount / ratio) * 100;
    const deviation = Math.abs(valuation - impliedValuation) / valuation;

    if (deviation > 0.3) {
      factors.push({
        dimension: '估值一致性',
        signal: 'high',
        value: `投资额推算估值与填报估值偏差 ${(deviation * 100).toFixed(0)}%`,
        description: '投资金额与股权比例推算的估值与填报估值差异较大，需确认',
        weight: valuationWeight,
      });
      totalScore += valuationWeight * 0.8;
    } else {
      factors.push({
        dimension: '估值一致性',
        signal: 'low',
        value: '投资额与估值比例一致',
        description: '投资金额、股权比例、估值三者逻辑自洽',
        weight: valuationWeight,
      });
      totalScore += valuationWeight * 0.1;
    }
  } else {
    factors.push({
      dimension: '估值一致性',
      signal: 'low',
      value: '不适用',
      description: '当前场景无需估值检查',
      weight: valuationWeight,
    });
    totalScore += valuationWeight * 0.1;
  }

  // 因子5: 领域合规
  const complianceWeight = 15;
  totalWeight += complianceWeight;
  factors.push({
    dimension: '领域合规',
    signal: 'low',
    value: filing.domain || 'unknown',
    description: '未发现领域合规风险提示',
    weight: complianceWeight,
  });
  totalScore += complianceWeight * 0.1;

  // 综合评分
  const normalizedScore = Math.round((totalScore / totalWeight) * 100);
  const level = normalizedScore >= 65 ? 'high' : normalizedScore >= 35 ? 'medium' : 'low';

  const recommendations: Record<string, string> = {
    high: '建议重点审查：金额较大或存在多次变更历史，建议安排专项尽调后再行审批。',
    medium: '建议常规审查：整体风险可控，建议审批人关注金额合理性和场景背景。',
    low: '风险较低：该备案属于常规事项，建议快速审批通过。',
  };

  return {
    filingId: filing.id || '',
    level,
    score: normalizedScore,
    factors,
    recommendation: recommendations[level],
    approvalChain: level === 'high' ? 'enhanced' : level === 'medium' ? 'standard' : 'light',
    assessedAt: new Date(),
  };
}

// ─── 审批摘要 ─────────────────────────────────────────────────

/**
 * 为审批人生成一句话摘要 + 关键要点
 * 真实实现：LLM 总结备案内容 + 风险要点
 */
export function generateSummary(filing: any, history?: any[]): ApprovalSummary {
  const amount = Number(filing.amount) || 0;
  const amountStr = amount >= 10000 ? `${(amount / 10000).toFixed(1)}亿元` : `${amount}万元`;

  // 按类型生成摘要
  const typeLabels: Record<string, string> = {
    direct_investment: '直投投资',
    earnout_change: '对赌变更',
    fund_exit: '基金退出',
    legal_entity_setup: '法人新设',
    other_change: '其他变更',
  };
  const typeLabel = typeLabels[filing.type] || '投资备案';

  // 一句话摘要
  let oneLiner = '';
  if (filing.type === 'earnout_change') {
    const originalTarget = Number(filing.originalTarget) || 0;
    const newTarget = Number(filing.newTarget) || 0;
    const changePercent = originalTarget > 0 ? ((newTarget - originalTarget) / originalTarget * 100).toFixed(0) : 'N/A';
    oneLiner = `${filing.projectName}${typeLabel}：对赌目标从${originalTarget}万元调整至${newTarget}万元（${changePercent}%），变更金额${amountStr}。`;
  } else if (filing.type === 'direct_investment') {
    const ratio = filing.investmentRatio ? `占股${filing.investmentRatio}%` : '';
    oneLiner = `${filing.projectName}${typeLabel}：拟投资${amountStr}${ratio ? '，' + ratio : ''}。`;
  } else if (filing.type === 'fund_exit') {
    oneLiner = `${filing.projectName}${typeLabel}：退出金额${amountStr}。`;
  } else {
    oneLiner = `${filing.projectName}${typeLabel}：金额${amountStr}。`;
  }

  // 关键要点
  const keyPoints: string[] = [
    `备案类型：${typeLabel}`,
    `项目名称：${filing.projectName}`,
    `涉及金额：${amountStr}`,
    `所属领域：${filing.domain === 'smart_living' ? '智慧生活' : filing.domain === 'industrial_finance' ? '产业金融' : '大健康'}`,
  ];
  if (filing.type === 'earnout_change' && filing.changeReason) {
    keyPoints.push(`变更原因：${filing.changeReason}`);
  }
  if (filing.type === 'direct_investment' && filing.valuationAmount) {
    keyPoints.push(`投前估值：${Number(filing.valuationAmount) >= 10000 ? `${(Number(filing.valuationAmount) / 10000).toFixed(1)}亿元` : `${filing.valuationAmount}万元`}`);
  }

  // 风险高亮
  const riskHighlights: string[] = [];
  if (amount > 50000) {
    riskHighlights.push('大额投资（超5亿元），需集团重点审查');
  }
  const earnoutHistory = (history || []).filter((h: any) => h.type === 'earnout_change');
  if (earnoutHistory.length > 0) {
    riskHighlights.push(`该项目历史上已有 ${earnoutHistory.length} 次对赌变更记录`);
  }
  if (filing.type === 'earnout_change') {
    const originalTarget = Number(filing.originalTarget) || 0;
    const newTarget = Number(filing.newTarget) || 0;
    if (originalTarget > 0 && newTarget < originalTarget * 0.7) {
      riskHighlights.push('对赌目标下调幅度超过30%，需关注底层资产质量');
    }
  }
  if (riskHighlights.length === 0) {
    riskHighlights.push('未发现显著风险信号');
  }

  // 历史关联
  const historicalContext: HistoricalItem[] = (history || []).slice(0, 5).map((h: any, i: number) => ({
    filingNumber: h.filingNumber || `BG2025XXXX-${String(i + 1).padStart(3, '0')}`,
    type: h.type || 'other_change',
    date: h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '2025-01-01',
    summary: h.title || `${filing.projectName}历史备案 #${i + 1}`,
  }));

  // 建议审批意见
  let suggestedOpinion = '';
  if (riskHighlights.some((r) => r.includes('重点审查') || r.includes('超过30%'))) {
    suggestedOpinion = '建议审慎评估后决定。该备案存在需关注的风险信号，建议要求发起人补充相关材料后再行审批。';
  } else if (amount > 10000) {
    suggestedOpinion = '同意。该备案整体风险可控，金额属于常规范围内，建议按标准流程审批通过。';
  } else {
    suggestedOpinion = '同意。该备案属于常规事项，风险较低，建议快速通过。';
  }

  return {
    filingId: filing.id || '',
    oneLiner,
    keyPoints,
    riskHighlights,
    attachmentSummary: null,
    suggestedOpinion,
    historicalContext,
  };
}

// ─── 审批意见建议 ──────────────────────────────────────────────

/**
 * 为审批人生成建议审批意见
 * 真实实现：综合风险评估 + 历史模式 + LLM 生成
 */
export function generateApprovalSuggestion(filing: any, riskAssessment: RiskAssessment): string {
  if (riskAssessment.level === 'high') {
    return `经 AI 分析，该备案风险评分 ${riskAssessment.score}/100（高风险）。主要风险因素：${riskAssessment.factors.filter((f) => f.signal === 'high').map((f) => f.dimension).join('、')}。建议：${riskAssessment.recommendation}`;
  }
  if (riskAssessment.level === 'medium') {
    return `经 AI 分析，该备案风险评分 ${riskAssessment.score}/100（中等风险）。建议关注：${riskAssessment.factors.filter((f) => f.signal !== 'low').map((f) => f.dimension).join('、')}。审批建议：同意，但请关注上述风险维度。`;
  }
  return `经 AI 分析，该备案风险评分 ${riskAssessment.score}/100（低风险）。各维度风险均在正常范围内，建议快速审批通过。`;
}

// ─── 基线检查 ─────────────────────────────────────────────────

export interface ComplianceCheckResult {
  passed: boolean;
  checks: Array<{
    rule: string;
    passed: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

/**
 * 提交前基线规则检查
 * 真实实现：规则引擎 + 外部系统校验
 */
export function checkBaseline(filing: any): ComplianceCheckResult {
  const checks: ComplianceCheckResult['checks'] = [];

  // 必填字段检查
  const requiredFields: Array<{ field: string; label: string }> = [
    { field: 'type', label: '备案类型' },
    { field: 'title', label: '备案标题' },
    { field: 'projectName', label: '项目名称' },
    { field: 'domain', label: '投资领域' },
    { field: 'industry', label: '行业分类' },
    { field: 'amount', label: '金额' },
  ];

  for (const { field, label } of requiredFields) {
    const value = filing[field];
    const missing = value === undefined || value === null || value === '' || value === 0;
    checks.push({
      rule: `必填字段: ${label}`,
      passed: !missing,
      message: missing ? `「${label}」不能为空` : `「${label}」已填写`,
      severity: missing ? 'error' : 'info',
    });
  }

  // 对赌变更专有检查
  if (filing.type === 'earnout_change') {
    const hasOriginal = filing.originalTarget != null && Number(filing.originalTarget) > 0;
    const hasNew = filing.newTarget != null && Number(filing.newTarget) > 0;
    const hasReason = filing.changeReason && filing.changeReason.trim().length > 0;

    checks.push({
      rule: '对赌变更: 原对赌目标',
      passed: hasOriginal,
      message: hasOriginal ? '原对赌目标已填写' : '对赌变更必须填写原对赌目标',
      severity: hasOriginal ? 'info' : 'error',
    });
    checks.push({
      rule: '对赌变更: 新对赌目标',
      passed: hasNew,
      message: hasNew ? '新对赌目标已填写' : '对赌变更必须填写新对赌目标',
      severity: hasNew ? 'info' : 'error',
    });
    checks.push({
      rule: '对赌变更: 变更原因',
      passed: !!hasReason,
      message: hasReason ? '变更原因已填写' : '对赌变更必须说明变更原因',
      severity: hasReason ? 'info' : 'error',
    });
  }

  // 直投专有检查
  if (filing.type === 'direct_investment') {
    const hasRatio = filing.investmentRatio != null && Number(filing.investmentRatio) > 0;
    checks.push({
      rule: '直投: 投资比例',
      passed: hasRatio,
      message: hasRatio ? '投资比例已填写' : '直接投资建议填写投资比例',
      severity: hasRatio ? 'info' : 'warning',
    });
  }

  // 金额上限检查
  const amount = Number(filing.amount) || 0;
  if (amount > 100000) {
    checks.push({
      rule: '金额上限',
      passed: false,
      message: '单笔投资金额超过10亿元，需提前获得董事会特别批准',
      severity: 'warning',
    });
  } else {
    checks.push({
      rule: '金额上限',
      passed: true,
      message: '投资金额在正常备案范围内',
      severity: 'info',
    });
  }

  // 描述长度检查
  const desc = filing.description || '';
  if (desc.length < 10) {
    checks.push({
      rule: '描述完整性',
      passed: false,
      message: '备案描述过短（少于10字），建议补充详细说明',
      severity: 'warning',
    });
  } else {
    checks.push({
      rule: '描述完整性',
      passed: true,
      message: '备案描述已填写',
      severity: 'info',
    });
  }

  const hasError = checks.some((c) => !c.passed && c.severity === 'error');
  return {
    passed: !hasError,
    checks,
  };
}

// ─── 数据查询（对话式） ────────────────────────────────────────

export interface QueryResult {
  answer: string;
  data: Record<string, unknown> | null;
  chartType: 'bar' | 'pie' | 'line' | 'table' | null;
  followUpQuestions: string[];
}

/**
 * 对话式数据查询
 * 真实实现：NL2SQL + 查询执行 + LLM 总结
 */
export function answerQuery(question: string, stats?: any): QueryResult {
  const q = question.toLowerCase();

  // 查询总量 / 统计
  if (q.includes('多少') || q.includes('总计') || q.includes('总共') || q.includes('数量')) {
    const totalCount = stats?.totalCount ?? 15;
    const totalAmount = stats?.totalAmount ?? '125000';
    return {
      answer: `当前系统中共有 ${totalCount} 笔备案记录，涉及总金额 ${Number(totalAmount) >= 10000 ? `${(Number(totalAmount) / 10000).toFixed(1)}亿元` : `${totalAmount}万元`}。其中草稿状态 3 笔，审批中 5 笔，已完成 7 笔。`,
      data: {
        totalCount,
        totalAmount,
        byStatus: stats?.byStatus ?? [
          { status: 'draft', count: 3 },
          { status: 'pending_level1', count: 3 },
          { status: 'pending_level2', count: 2 },
          { status: 'completed', count: 7 },
        ],
      },
      chartType: 'pie',
      followUpQuestions: [
        '各领域的备案分布如何？',
        '本月新增了几笔备案？',
        '金额最大的备案是哪个？',
      ],
    };
  }

  // 查询某个项目
  if (q.includes('海川') || q.includes('瑞丰') || q.includes('星辰') || q.includes('康明')) {
    const project = q.includes('海川') ? '海川项目' : q.includes('瑞丰') ? '瑞丰项目' : q.includes('星辰') ? '星辰基金' : '康明项目';
    return {
      answer: `「${project}」共有 3 笔关联备案：1笔直投投资（已完成）、1笔对赌变更（审批中）、1笔法人新设（已完成）。累计涉及金额约4.5亿元。最近一笔为对赌变更备案，当前处于集团审批阶段。`,
      data: {
        projectName: project,
        filingCount: 3,
        totalAmount: 45000,
        latestFiling: {
          type: 'earnout_change',
          status: 'pending_level2',
          amount: 6500,
        },
      },
      chartType: 'table',
      followUpQuestions: [
        `${project}的对赌变更详情是什么？`,
        `${project}的投资回报情况如何？`,
        `谁在负责${project}的审批？`,
      ],
    };
  }

  // 查询领域分布
  if (q.includes('领域') || q.includes('分布') || q.includes('行业')) {
    return {
      answer: '各投资领域备案分布：智慧生活领域 6 笔（40%），产业金融领域 5 笔（33%），大健康领域 4 笔（27%）。从金额看，产业金融领域占比最高，达52%。',
      data: {
        byDomain: [
          { domain: 'smart_living', label: '智慧生活', count: 6, amount: 35000 },
          { domain: 'industrial_finance', label: '产业金融', count: 5, amount: 65000 },
          { domain: 'health', label: '大健康', count: 4, amount: 25000 },
        ],
      },
      chartType: 'bar',
      followUpQuestions: [
        '哪个领域的审批通过率最高？',
        '各领域的平均投资金额是多少？',
        '最近一个月新增最多的领域是？',
      ],
    };
  }

  // 查询审批效率
  if (q.includes('审批') && (q.includes('效率') || q.includes('速度') || q.includes('时长'))) {
    return {
      answer: '近30天审批效率统计：平均审批时长 2.3 个工作日，其中一级审批平均 0.8 天，二级审批平均 1.5 天。最快审批仅用 2 小时（低风险小额备案），最慢 5 天（大额直投）。',
      data: {
        avgDays: 2.3,
        level1AvgDays: 0.8,
        level2AvgDays: 1.5,
        fastest: '2小时',
        slowest: '5天',
      },
      chartType: 'bar',
      followUpQuestions: [
        '哪些备案审批最慢？',
        '审批被驳回的原因主要有哪些？',
        '本周有几笔待审批？',
      ],
    };
  }

  // 默认回答
  return {
    answer: `关于您的问题「${question}」——当前 PoC 版本支持以下查询：备案数量统计、项目关联查询、领域分布分析、审批效率分析。请尝试更具体的提问，例如"海川项目有多少笔备案？"或"各领域的备案分布如何？"`,
    data: null,
    chartType: null,
    followUpQuestions: [
      '目前共有多少笔备案？',
      '海川项目的备案情况如何？',
      '各领域的投资分布是什么样的？',
    ],
  };
}

// ─── 辅助函数 ─────────────────────────────────────────────────

function makeSource(
  field: string,
  source: FieldSource['source'],
  confidence: number,
  detail: string,
): FieldSource {
  return { field, source, confidence, sourceDetail: detail };
}

/** 从自然语言中提取项目名 */
function extractProjectName(msg: string): string | null {
  const knownProjects = ['海川项目', '海川', '星辰基金', '星辰', '瑞丰项目', '瑞丰', '康明项目', '康明', '创新科技项目', '创新科技'];
  for (const name of knownProjects) {
    if (msg.includes(name.toLowerCase()) || msg.includes(name)) {
      // 返回完整项目名
      if (name === '海川') return '海川项目';
      if (name === '星辰') return '星辰基金';
      if (name === '瑞丰') return '瑞丰项目';
      if (name === '康明') return '康明项目';
      if (name === '创新科技') return '创新科技项目';
      return name;
    }
  }
  return null;
}

/** 从自然语言中提取金额 */
function extractAmount(msg: string): number | null {
  // 匹配 "X亿" 或 "X万"
  const yiMatch = msg.match(/(\d+(?:\.\d+)?)\s*亿/);
  if (yiMatch) return parseFloat(yiMatch[1]) * 10000;

  const wanMatch = msg.match(/(\d+(?:\.\d+)?)\s*万/);
  if (wanMatch) return parseFloat(wanMatch[1]);

  return null;
}

/** 从自然语言中提取变更原因 */
function extractChangeReason(msg: string): string | null {
  const reasonPatterns = [
    /原因[是为：:]\s*(.+)/,
    /因为\s*(.+)/,
    /由于\s*(.+)/,
  ];
  for (const pattern of reasonPatterns) {
    const match = msg.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}
