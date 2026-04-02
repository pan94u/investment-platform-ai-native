import type { OrgProvider, NotifyProvider, EmailProvider } from './types.js';
import { DatabaseOrgProvider } from './org-db.js';
import { MockNotifyProvider } from './notify-mock.js';
import { FeishuNotifyProvider } from './notify-feishu.js';
import { MockEmailProvider } from './email-mock.js';
import { SmtpEmailProvider } from './email-smtp.js';

let orgSingleton: OrgProvider | null = null;
let notifySingleton: NotifyProvider | null = null;
let emailSingleton: EmailProvider | null = null;

export function getOrgProvider(): OrgProvider {
  if (!orgSingleton) {
    orgSingleton = new DatabaseOrgProvider();
  }
  return orgSingleton;
}

export function getNotifyProvider(): NotifyProvider {
  if (!notifySingleton) {
    notifySingleton = process.env.FEISHU_APP_ID
      ? new FeishuNotifyProvider()
      : new MockNotifyProvider();
  }
  return notifySingleton;
}

export function getEmailProvider(): EmailProvider {
  if (!emailSingleton) {
    emailSingleton = process.env.SMTP_HOST
      ? new SmtpEmailProvider()
      : new MockEmailProvider();
  }
  return emailSingleton;
}

export type {
  OrgProvider, NotifyProvider, EmailProvider, TodoPayload, EmailPayload,
  ApproverChainContext, ApproverInfo,
  GroupApproverInfo, ConfirmationInfo,
} from './types.js';
