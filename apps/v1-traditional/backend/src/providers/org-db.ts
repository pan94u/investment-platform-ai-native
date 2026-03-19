import { eq, and } from 'drizzle-orm';
import { users } from '@filing/database';
import { db } from '../lib/db.js';
import type { OrgProvider, ApproverChainContext, ApproverInfo } from './types.js';

/**
 * 从本地 users 表查审批链
 * 同人捏合: 如果 L1 和 L2 是同一人，返回单元素数组
 */
export class DatabaseOrgProvider implements OrgProvider {
  async getApproverChain(ctx: ApproverChainContext): Promise<readonly ApproverInfo[]> {
    // L1: 优先匹配同部门 supervisor，fallback 到任意 supervisor
    const sameDeptSupervisors = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.role, 'supervisor'), eq(users.domain, ctx.creatorDomain)));

    const allSupervisors = sameDeptSupervisors.length > 0
      ? sameDeptSupervisors
      : await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, 'supervisor'));

    if (allSupervisors.length === 0) {
      throw new Error('未找到上级审批人');
    }

    const l1 = allSupervisors[0];

    // L2: 集团审批人
    const groupApprovers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.role, 'group_approver'));

    if (groupApprovers.length === 0) {
      throw new Error('未找到集团审批人');
    }

    const l2 = groupApprovers[0];

    // 同人捏合: L1 === L2 时只返回一级
    if (l1.id === l2.id) {
      return [{ userId: l1.id, name: l1.name, level: 1 }];
    }

    return [
      { userId: l1.id, name: l1.name, level: 1 },
      { userId: l2.id, name: l2.name, level: 2 },
    ];
  }
}
