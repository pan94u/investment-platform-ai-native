import { eq, and } from 'drizzle-orm';
import { approvalConfigs, emailCcConfigs } from '@filing/database';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';
import * as auditService from './audit.js';

// ─── 审批节点配置 ────────────────────────────────────

/** 按 groupName 分组返回审批配置 */
export async function getApprovalGroupConfigs() {
  const rows = await db
    .select()
    .from(approvalConfigs)
    .where(eq(approvalConfigs.isActive, true));

  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    const group = row.groupName;
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(row);
  }
  return grouped;
}

/** 新增/更新审批配置 */
export async function upsertApprovalGroupConfig(
  groupName: string,
  userId: string,
  userName: string,
  userEmail: string,
  operatorId: string,
  operatorName: string,
) {
  const id = generateId('ac');
  const [config] = await db.insert(approvalConfigs).values({
    id,
    groupName,
    userId,
    userName,
    userEmail,
    isActive: true,
  }).returning();

  await auditService.logAudit({
    action: 'config_updated',
    entityType: 'approval',
    entityId: id,
    userId: operatorId,
    userName: operatorName,
    detail: { type: 'approval_config_add', groupName, userName, userEmail },
  });

  return config;
}

/** 删除审批配置（软删除） */
export async function removeApprovalGroupConfig(
  id: string,
  operatorId: string,
  operatorName: string,
) {
  const existing = await db.select().from(approvalConfigs).where(eq(approvalConfigs.id, id)).limit(1);
  if (existing.length === 0) throw new Error('配置不存在');

  await db.update(approvalConfigs).set({ isActive: false, updatedAt: new Date() }).where(eq(approvalConfigs.id, id));

  await auditService.logAudit({
    action: 'config_updated',
    entityType: 'approval',
    entityId: id,
    userId: operatorId,
    userName: operatorName,
    detail: { type: 'approval_config_remove', groupName: existing[0].groupName, userName: existing[0].userName },
  });

  return { success: true };
}

// ─── 邮件抄送配置 ────────────────────────────────────

/** 获取邮件抄送配置 */
export async function getEmailCcConfigs() {
  const rows = await db
    .select()
    .from(emailCcConfigs)
    .where(eq(emailCcConfigs.isActive, true));

  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    const group = row.groupName;
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(row);
  }
  return grouped;
}

/** 新增邮件抄送配置 */
export async function upsertEmailCcConfig(
  groupName: string,
  name: string,
  email: string,
  operatorId: string,
  operatorName: string,
) {
  const id = generateId('ecc');
  const [config] = await db.insert(emailCcConfigs).values({
    id,
    groupName,
    name,
    email,
    isActive: true,
  }).returning();

  await auditService.logAudit({
    action: 'config_updated',
    entityType: 'user',
    entityId: id,
    userId: operatorId,
    userName: operatorName,
    detail: { type: 'email_cc_add', groupName, name, email },
  });

  return config;
}

/** 删除邮件抄送配置（软删除） */
export async function removeEmailCcConfig(
  id: string,
  operatorId: string,
  operatorName: string,
) {
  const existing = await db.select().from(emailCcConfigs).where(eq(emailCcConfigs.id, id)).limit(1);
  if (existing.length === 0) throw new Error('配置不存在');

  await db.update(emailCcConfigs).set({ isActive: false }).where(eq(emailCcConfigs.id, id));

  await auditService.logAudit({
    action: 'config_updated',
    entityType: 'user',
    entityId: id,
    userId: operatorId,
    userName: operatorName,
    detail: { type: 'email_cc_remove', groupName: existing[0].groupName, name: existing[0].name },
  });

  return { success: true };
}
