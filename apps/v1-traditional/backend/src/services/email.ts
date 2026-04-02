import { eq } from 'drizzle-orm';
import { filings, users, approvals, attachments, emailCcConfigs } from '@filing/database';
import { FILING_TYPE_CONFIG, APPROVAL_GROUP_CONFIG, PROJECT_STAGE_CONFIG } from '@filing/shared';
import { db } from '../lib/db.js';
import { getEmailProvider } from '../providers/index.js';
import * as auditService from './audit.js';

export interface EmailPreviewData {
  to: Array<{ email: string; name: string; userId?: string }>;
  cc: Array<{ email: string; name: string }>;
  subject: string;
  htmlBody: string;
  attachments: Array<{ filename: string; mimeType: string; path: string }>;
}

/**
 * 获取邮件预览数据（不发送）
 */
export async function getEmailPreview(filingId: string): Promise<EmailPreviewData | null> {
  // 1. 查 filing + 创建者
  const filingRows = await db
    .select()
    .from(filings)
    .leftJoin(users, eq(filings.creatorId, users.id))
    .where(eq(filings.id, filingId));

  if (filingRows.length === 0) return null;

  const filing = filingRows[0].filings;
  const creator = filingRows[0].users;

  // 2. 收集收件人（带姓名）
  const toList: Array<{ email: string; name: string; userId?: string }> = [];
  const seenEmails = new Set<string>();

  // 来源 1: 审批链上所有人
  const approvalRows = await db
    .select({ approverId: approvals.approverId })
    .from(approvals)
    .where(eq(approvals.filingId, filingId));

  const approverIds = [...new Set(approvalRows.map(a => a.approverId))];
  for (const approverId of approverIds) {
    const userRows = await db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(eq(users.id, approverId)).limit(1);
    const u = userRows[0];
    if (u?.email && !seenEmails.has(u.email)) {
      seenEmails.add(u.email);
      toList.push({ email: u.email, name: u.name, userId: u.id });
    }
  }

  // 创建者
  if (creator?.email && !seenEmails.has(creator.email)) {
    seenEmails.add(creator.email);
    toList.push({ email: creator.email, name: creator.name, userId: creator.id });
  }

  // 来源 2: 表单指定收件人
  const emailRecipientIds = (filing.emailRecipients ?? []) as string[];
  for (const recipientId of emailRecipientIds) {
    const userRows = await db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(eq(users.id, recipientId)).limit(1);
    const u = userRows[0];
    if (u?.email && !seenEmails.has(u.email)) {
      seenEmails.add(u.email);
      toList.push({ email: u.email, name: u.name, userId: u.id });
    }
  }

  // 来源 3: 固定抄送名单
  const ccList: Array<{ email: string; name: string }> = [];
  const approvalGroups = (filing.approvalGroups ?? []) as string[];
  if (approvalGroups.length > 0) {
    const ccRows = await db.select().from(emailCcConfigs).where(eq(emailCcConfigs.isActive, true));
    for (const row of ccRows) {
      if (approvalGroups.includes(row.groupName) && !seenEmails.has(row.email)) {
        ccList.push({ email: row.email, name: row.name });
      }
    }
  }

  // 3. 构建邮件体
  const typeLabel = FILING_TYPE_CONFIG[filing.type as keyof typeof FILING_TYPE_CONFIG]?.label ?? filing.type;
  const stageLabel = PROJECT_STAGE_CONFIG[filing.projectStage as keyof typeof PROJECT_STAGE_CONFIG]?.label ?? filing.projectStage;

  const htmlBody = buildEmailHtml({
    filingNumber: filing.filingNumber,
    title: filing.title,
    type: typeLabel,
    stage: stageLabel,
    projectName: filing.projectName,
    projectCode: filing.projectCode ?? '-',
    amount: filing.amount,
    domain: filing.domain,
    industry: filing.industry,
    description: filing.description,
    creatorName: creator?.name ?? '-',
    approvalGroups: approvalGroups.map(g => APPROVAL_GROUP_CONFIG[g as keyof typeof APPROVAL_GROUP_CONFIG]?.label ?? g),
  });

  // 4. 附件
  const attachmentRows = await db.select().from(attachments).where(eq(attachments.filingId, filingId));
  const emailAttachments = attachmentRows.map(a => ({
    filename: a.filename,
    path: a.filePath,
    mimeType: a.mimeType,
  }));

  const subject = `[投资备案] ${filing.filingNumber} ${filing.title} — 已完成`;

  return { to: toList, cc: ccList, subject, htmlBody, attachments: emailAttachments };
}

/**
 * 发送备案完结邮件（默认收件人）
 */
export async function sendCompletionEmail(filingId: string): Promise<boolean> {
  const preview = await getEmailPreview(filingId);
  if (!preview) return false;

  return doSendEmail(filingId, {
    to: preview.to.map(r => r.email),
    cc: preview.cc.map(r => r.email),
    subject: preview.subject,
    htmlBody: preview.htmlBody,
    attachments: preview.attachments,
  });
}

/**
 * 发送备案完结邮件（可覆盖收件人/主题）
 */
export async function sendCompletionEmailWithOverrides(
  filingId: string,
  overrides: { to?: string[]; cc?: string[]; subject?: string },
): Promise<boolean> {
  const preview = await getEmailPreview(filingId);
  if (!preview) return false;

  return doSendEmail(filingId, {
    to: overrides.to ?? preview.to.map(r => r.email),
    cc: overrides.cc ?? preview.cc.map(r => r.email),
    subject: overrides.subject ?? preview.subject,
    htmlBody: preview.htmlBody,
    attachments: preview.attachments,
  });
}

/** 实际发送 + 更新 filingTime + 审计 */
async function doSendEmail(filingId: string, payload: {
  to: string[];
  cc: string[];
  subject: string;
  htmlBody: string;
  attachments: Array<{ filename: string; path: string; mimeType: string }>;
}): Promise<boolean> {
  const emailProvider = getEmailProvider();

  const success = await emailProvider.sendEmail({
    to: payload.to,
    cc: payload.cc,
    subject: payload.subject,
    htmlBody: payload.htmlBody,
    attachments: payload.attachments,
  });

  if (success) {
    await db.update(filings).set({ filingTime: new Date() }).where(eq(filings.id, filingId));
  }

  await auditService.logAudit({
    action: 'email_sent',
    entityType: 'filing',
    entityId: filingId,
    userId: 'system',
    userName: 'system',
    detail: {
      toCount: payload.to.length,
      ccCount: payload.cc.length,
      attachmentCount: payload.attachments.length,
      success,
    },
  });

  return success;
}

function buildEmailHtml(data: {
  filingNumber: string;
  title: string;
  type: string;
  stage: string;
  projectName: string;
  projectCode: string;
  amount: string;
  domain: string;
  industry: string;
  description: string;
  creatorName: string;
  approvalGroups: string[];
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #0066CC; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 18px;">投资备案已完成</h1>
    <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">${data.filingNumber}</p>
  </div>

  <div style="border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
    <h2 style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">${data.title}</h2>

    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 8px 0; color: #666; width: 120px;">备案类型</td><td style="padding: 8px 0;">${data.type} · ${data.stage}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">项目名称</td><td style="padding: 8px 0;">${data.projectName}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">项目编号</td><td style="padding: 8px 0;">${data.projectCode}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">金额</td><td style="padding: 8px 0; font-weight: 600;">${Number(data.amount).toLocaleString()} 万元</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">领域 / 行业</td><td style="padding: 8px 0;">${data.domain} / ${data.industry}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">发起人</td><td style="padding: 8px 0;">${data.creatorName}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">审批组</td><td style="padding: 8px 0;">${data.approvalGroups.join('、')}</td></tr>
    </table>

    ${data.description ? `
    <div style="margin-top: 16px; padding: 16px; background: #f9f9f9; border-radius: 6px;">
      <div style="font-size: 13px; color: #666; margin-bottom: 8px;">备案具体事项</div>
      <div style="font-size: 14px; line-height: 1.6;">${data.description}</div>
    </div>
    ` : ''}

    <p style="margin-top: 20px; font-size: 12px; color: #999;">此邮件由投资备案系统自动发送，请勿直接回复。</p>
  </div>
</body>
</html>`.trim();
}
