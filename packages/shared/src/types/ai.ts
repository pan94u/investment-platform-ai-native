/** AI 对话消息 */
export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly timestamp: Date;
  readonly metadata?: ChatMessageMetadata;
}

/** 消息元数据 */
export interface ChatMessageMetadata {
  readonly filingId?: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly fieldSources?: Record<string, FieldSource>;
}

/** AI 工具调用记录 */
export interface ToolCall {
  readonly tool: string;
  readonly input: Record<string, unknown>;
  readonly output: Record<string, unknown>;
  readonly durationMs: number;
}

/** 字段来源标注 */
export interface FieldSource {
  readonly field: string;
  readonly source: 'ai_extract' | 'ai_prefill' | 'user_input' | 'system_auto' | 'doc_extract';
  readonly confidence: number; // 0-1
  readonly sourceDetail?: string; // e.g. "从上传文档第2页提取"
}

/** AI 预填充结果 */
export interface AIPrefillResult {
  readonly fields: Record<string, unknown>;
  readonly fieldSources: Record<string, FieldSource>;
  readonly confidence: number;
  readonly explanation: string;
}

/** AI 风险评估 */
export interface RiskAssessment {
  readonly filingId: string;
  readonly level: 'low' | 'medium' | 'high';
  readonly score: number; // 0-100
  readonly factors: readonly RiskFactor[];
  readonly recommendation: string;
  readonly approvalChain: 'light' | 'standard' | 'enhanced';
  readonly assessedAt: Date;
}

/** 风险因子 */
export interface RiskFactor {
  readonly dimension: string;
  readonly signal: 'low' | 'medium' | 'high';
  readonly value: string;
  readonly description: string;
  readonly weight: number;
}

/** AI 审批摘要 */
export interface ApprovalSummary {
  readonly filingId: string;
  readonly oneLiner: string;
  readonly keyPoints: readonly string[];
  readonly riskHighlights: readonly string[];
  readonly attachmentSummary: string | null;
  readonly suggestedOpinion: string;
  readonly historicalContext: readonly HistoricalItem[];
}

/** 历史关联项 */
export interface HistoricalItem {
  readonly filingNumber: string;
  readonly type: string;
  readonly date: string;
  readonly summary: string;
}

/** 审批上下文快照 */
export interface ApprovalContextSnapshot {
  readonly approvalId: string;
  readonly filingId: string;
  readonly viewedAt: Date;
  readonly summaryShown: string;
  readonly riskPanelShown: RiskAssessment;
  readonly suggestedOpinion: string;
  readonly approverAction: string;
  readonly approverComment: string;
}

/** 文档提取结果 */
export interface DocumentExtraction {
  readonly filename: string;
  readonly extractedFields: Record<string, unknown>;
  readonly fieldSources: Record<string, FieldSource>;
  readonly summary: string;
  readonly pageCount: number;
  readonly confidence: number;
}

/** 对话式备案会话 */
export interface FilingConversation {
  readonly id: string;
  readonly filingId: string | null;
  readonly userId: string;
  readonly messages: readonly ChatMessage[];
  readonly status: 'active' | 'completed' | 'abandoned';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
