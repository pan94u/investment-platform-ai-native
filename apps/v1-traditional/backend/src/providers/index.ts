import type { OrgProvider, NotifyProvider } from './types.js';
import { DatabaseOrgProvider } from './org-db.js';
import { MockNotifyProvider } from './notify-mock.js';
import { FeishuNotifyProvider } from './notify-feishu.js';

let orgSingleton: OrgProvider | null = null;
let notifySingleton: NotifyProvider | null = null;

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

export type { OrgProvider, NotifyProvider, TodoPayload, ApproverChainContext, ApproverInfo } from './types.js';
