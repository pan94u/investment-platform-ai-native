import { eq, desc } from 'drizzle-orm';
import { auditLogs } from '@filing/database';
import type { AuditAction } from '@filing/shared';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';

/** 记录审计日志 */
export async function logAudit(params: {
  action: AuditAction;
  entityType: 'filing' | 'approval' | 'attachment' | 'user';
  entityId: string;
  userId: string;
  userName: string;
  detail?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id: generateId('audit'),
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    userId: params.userId,
    userName: params.userName,
    detail: params.detail ?? {},
  });
}

/** 查询实体的审计日志 */
export async function getAuditLogs(entityType: string, entityId: string) {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.entityId, entityId))
    .orderBy(desc(auditLogs.createdAt));
}
