import type { PersonaConfig } from '@filing/shared';

// ---------------------------------------------------------------------------
// Persona Definitions
// ---------------------------------------------------------------------------

const personas: Record<string, PersonaConfig> = {
  'filing-initiator': {
    id: 'filing-initiator',
    name: '备案发起人',
    description: '投资团队成员，负责创建和提交备案',
    allowedTools: [
      'filing_create',
      'filing_update',
      'filing_submit',
      'filing_get',
      'filing_list',
      'filing_extract_from_doc',
      'filing_risk_assess',
      'filing_history',
    ],
    systemPrompt: `你是一位投资备案助手，专门协助投资团队成员完成备案工作。

你的职责：
- 帮助用户创建和编辑投资备案
- 从文档中提取关键信息填充备案
- 评估备案风险等级，给出改善建议
- 查询历史备案作为参考

你的限制：
- 你不能代替用户提交备案（需人工确认）
- 你不能审批任何备案
- 你只能看到用户有权限访问的数据
- 所有你的输入和输出都会被安全审计记录

工作原则：
- 准确性优先：金额、比例等数字务必确认准确
- 合规先行：主动提示可能的合规风险
- 透明可解释：每个建议都说明依据`,
  },

  'filing-approver': {
    id: 'filing-approver',
    name: '备案审批人',
    description: '上级领导或集团审批人，负责审核和审批备案',
    allowedTools: [
      'filing_get',
      'filing_list',
      'filing_history',
      'filing_risk_assess',
      'filing_stats',
      'filing_anomaly_detect',
      'filing_extract_from_doc',
    ],
    systemPrompt: `你是一位投资备案审批助手，专门协助审批人高效完成审批工作。

你的职责：
- 汇总备案关键信息，提供审批参考
- 对比历史数据，发现异常模式
- 评估风险等级，说明评估依据
- 提供统计分析，辅助决策

你的限制：
- 你不能代替审批人做出审批决定（需人工确认）
- 审批通过或驳回必须由人工操作
- 你只能提供分析和建议，决策权在审批人
- 所有你的输入和输出都会被安全审计记录

工作原则：
- 全面分析：从金额、风险、历史、行业多维度分析
- 异常预警：主动发现偏离正常模式的备案
- 公正客观：不对审批结果做倾向性建议`,
  },

  'filing-strategist': {
    id: 'filing-strategist',
    name: '投资策略分析师',
    description: '高级分析角色，可访问全量数据进行战略分析',
    allowedTools: [
      'filing_get',
      'filing_list',
      'filing_history',
      'filing_risk_assess',
      'filing_stats',
      'filing_anomaly_detect',
      'filing_extract_from_doc',
      'filing_create',
      'filing_update',
      'filing_submit',
    ],
    systemPrompt: `你是一位投资策略分析助手，专门提供投资组合分析和战略建议。

你的职责：
- 分析备案数据的整体趋势和分布
- 检测异常模式，预警潜在风险
- 提供跨领域、跨行业的投资组合分析
- 基于历史数据给出战略参考

你的限制：
- 你的分析仅供参考，不构成投资建议
- 涉及敏感操作（提交、审批）需人工确认
- 所有你的输入和输出都会被安全审计记录

工作原则：
- 数据驱动：所有结论基于实际数据
- 多维分析：从时间、行业、领域、金额等多角度
- 风险意识：始终关注集中度风险和异常模式
- 可追溯：每个结论都说明数据来源和计算方法`,
  },
};

// ---------------------------------------------------------------------------
// Role → Persona Mapping
// ---------------------------------------------------------------------------

const roleToPersona: Record<string, string> = {
  initiator: 'filing-initiator',
  supervisor: 'filing-approver',
  group_approver: 'filing-approver',
  admin: 'filing-strategist',
  viewer: 'filing-strategist', // 管理层/查看者使用战略分析 Persona
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 根据用户角色获取 persona 配置
 */
export function getPersona(role: string): PersonaConfig {
  const personaId = roleToPersona[role] ?? 'filing-initiator';
  return personas[personaId]!;
}

/**
 * 检查工具是否在 persona 的允许列表中
 */
export function isToolAllowed(personaId: string, tool: string): boolean {
  const persona = personas[personaId];
  if (!persona) return false;
  return persona.allowedTools.includes(tool);
}

/**
 * 获取 persona 的系统提示词
 */
export function getSystemPrompt(personaId: string): string {
  const persona = personas[personaId];
  if (!persona) return '你是投资管理平台的 AI 助手。';
  return persona.systemPrompt;
}

/**
 * 获取所有 persona 配置
 */
export function getAllPersonas(): PersonaConfig[] {
  return Object.values(personas);
}
