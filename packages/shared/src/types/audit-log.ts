/** 操作类型 */
export type AuditAction =
  | 'filing_created'
  | 'filing_updated'
  | 'filing_submitted'
  | 'filing_approved'
  | 'filing_rejected'
  | 'filing_recalled'
  | 'approval_reassigned'
  | 'approval_batch_approved'
  | 'attachment_uploaded'
  | 'attachment_deleted'
  | 'user_login'
  | 'user_logout';

/** 审计日志（留痕基座） */
export interface AuditLog {
  readonly id: string;
  readonly action: AuditAction;
  readonly entityType: 'filing' | 'approval' | 'attachment' | 'user';
  readonly entityId: string;
  readonly userId: string;
  readonly userName: string;
  readonly detail: Record<string, unknown>;    // 变更详情
  readonly fieldSource: Record<string, string> | null;  // 字段来源标注（V3+）
  readonly createdAt: Date;
}
