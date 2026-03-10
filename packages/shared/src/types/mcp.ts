/** MCP 工具定义 */
export interface MCPTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/** MCP 工具调用请求 */
export interface MCPToolRequest {
  readonly tool: string;
  readonly arguments: Record<string, unknown>;
}

/** MCP 工具调用响应 */
export interface MCPToolResponse {
  readonly content: readonly MCPContent[];
  readonly isError?: boolean;
}

/** MCP 内容块 */
export interface MCPContent {
  readonly type: 'text' | 'resource' | 'image';
  readonly text?: string;
  readonly resource?: { readonly uri: string; readonly mimeType: string; readonly text: string };
}

/** 合规规则 */
export interface ComplianceRule {
  readonly id: string;
  readonly name: string;
  readonly type: 'pre_hook' | 'post_hook';
  readonly description: string;
  readonly condition: string;
  readonly action: 'block' | 'warn' | 'log';
  readonly enabled: boolean;
}

/** 合规检查结果 */
export interface ComplianceCheckResult {
  readonly passed: boolean;
  readonly violations: readonly ComplianceViolation[];
  readonly warnings: readonly ComplianceViolation[];
}

/** 合规违规项 */
export interface ComplianceViolation {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly field?: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

/** Persona 角色配置 */
export interface PersonaConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly allowedTools: readonly string[];
  readonly systemPrompt: string;
}

/** 安全审计记录 */
export interface SecurityAuditEntry {
  readonly id: string;
  readonly type: 'ai_input' | 'ai_output' | 'permission_check' | 'data_access';
  readonly userId: string;
  readonly action: string;
  readonly input?: string;
  readonly output?: string;
  readonly sanitized: boolean;
  readonly allowed: boolean;
  readonly reason?: string;
  readonly timestamp: Date;
}
