import { eq, and, sql } from 'drizzle-orm';
import { approvalConfigs, emailCcConfigs } from '@filing/database';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';
import * as auditService from './audit.js';

/** email normalize：trim + lowercase。匹配时也要 SQL lower() 兼容旧数据 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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

/** 新增审批配置（去重：同 groupName + 同 email 的 active 记录不能重复添加）
 *
 * BUG-013 修复：之前函数名叫 upsert 但实际只 INSERT，导致重复加人。
 * 现在加了去重检查 + 邮箱 normalize，重复时抛友好错误。
 */
export async function upsertApprovalGroupConfig(
  groupName: string,
  userId: string,
  userName: string,
  userEmail: string,
  operatorId: string,
  operatorName: string,
) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!normalizedEmail) throw new Error('邮箱不能为空');

  const existing = await db
    .select({ id: approvalConfigs.id, userName: approvalConfigs.userName })
    .from(approvalConfigs)
    .where(
      and(
        eq(approvalConfigs.groupName, groupName),
        sql`lower(${approvalConfigs.userEmail}) = ${normalizedEmail}`,
        eq(approvalConfigs.isActive, true),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error(`「${existing[0].userName}」已在此审批组中，无需重复添加`);
  }

  const id = generateId('ac');
  await db.insert(approvalConfigs).values({
    id,
    groupName,
    userId,
    userName,
    userEmail: normalizedEmail,
    isActive: true,
  });
  const [config] = await db.select().from(approvalConfigs).where(eq(approvalConfigs.id, id)).limit(1);

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

/** 新增邮件抄送配置（去重：同 groupName + 同 email 的 active 记录不能重复添加）
 *
 * BUG-014 修复：与 BUG-013 同源问题。
 */
export async function upsertEmailCcConfig(
  groupName: string,
  name: string,
  email: string,
  operatorId: string,
  operatorName: string,
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error('邮箱不能为空');

  const existing = await db
    .select({ id: emailCcConfigs.id, name: emailCcConfigs.name })
    .from(emailCcConfigs)
    .where(
      and(
        eq(emailCcConfigs.groupName, groupName),
        sql`lower(${emailCcConfigs.email}) = ${normalizedEmail}`,
        eq(emailCcConfigs.isActive, true),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error(`「${existing[0].name}」已在此抄送组中，无需重复添加`);
  }

  const id = generateId('ecc');
  await db.insert(emailCcConfigs).values({
    id,
    groupName,
    name,
    email: normalizedEmail,
    isActive: true,
  });
  const [config] = await db.select().from(emailCcConfigs).where(eq(emailCcConfigs.id, id)).limit(1);

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
