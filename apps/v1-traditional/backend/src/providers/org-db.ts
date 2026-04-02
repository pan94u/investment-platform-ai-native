import { eq, and } from 'drizzle-orm';
import { users, approvalConfigs } from '@filing/database';
import type { ApprovalGroupName } from '@filing/shared';
import { db } from '../lib/db.js';
import { getEmployeeByCode, getManagerChain } from '../services/org-query.js';
import type { OrgProvider, ApproverChainContext, ApproverInfo, GroupApproverInfo, ConfirmationInfo } from './types.js';

/**
 * 组织数据提供者
 * 业务侧审批链：从 MySQL org 表 line1_manager_code 逐级上溯
 * 集团审批组：从 PostgreSQL approval_group_configs 表查
 * 最终确认：从 approval_group_configs confirmation 组查
 */
export class DatabaseOrgProvider implements OrgProvider {
  /**
   * 获取业务侧审批链（逐级上溯直线经理）
   * 数据源：MySQL td_hrp2001_emp_org.line1_manager_code
   * 终止条件：平台主 或 深度 5 级
   */
  async getBusinessApproverChain(ctx: ApproverChainContext): Promise<readonly ApproverInfo[]> {
    const chain: ApproverInfo[] = [];

    // 尝试从 org 表获取真实经理链
    const managerChain = await getManagerChain(ctx.creatorId, 5);

    if (managerChain.length > 0) {
      // 真实经理链
      for (const manager of managerChain) {
        // 排除发起人自己
        if (manager.empCode === ctx.creatorId) continue;
        // 同人捏合
        const last = chain[chain.length - 1];
        if (last && last.userId === manager.empCode) continue;

        chain.push({
          userId: manager.empCode,
          name: manager.empName,
          level: chain.length + 1,
        });
      }

      if (chain.length > 0) return chain;
    }

    // 降级：PoC 模式（本地 users 表 supervisor → admin）
    const sameDomainSupervisors = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.role, 'supervisor'), eq(users.domain, ctx.creatorDomain)));

    const allSupervisors = sameDomainSupervisors.length > 0
      ? sameDomainSupervisors
      : await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, 'supervisor'));

    if (allSupervisors.length > 0) {
      const supervisor = allSupervisors[0];
      if (supervisor.id !== ctx.creatorId) {
        chain.push({ userId: supervisor.id, name: supervisor.name, level: chain.length + 1 });
      }
    }

    const admins = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.role, 'admin'));

    if (admins.length > 0) {
      const admin = admins[0];
      const last = chain[chain.length - 1];
      if (admin.id !== ctx.creatorId && (!last || admin.id !== last.userId)) {
        chain.push({ userId: admin.id, name: admin.name, level: chain.length + 1 });
      }
    }

    if (chain.length === 0) {
      throw new Error('未找到有效的业务侧审批人');
    }

    return chain;
  }

  /**
   * 获取集团审批组审批人
   * 优先查 approval_group_configs 表，降级到 users 表
   */
  async getGroupApprovers(groupNames: readonly ApprovalGroupName[]): Promise<readonly GroupApproverInfo[]> {
    if (groupNames.length === 0) return [];

    const result: GroupApproverInfo[] = [];

    const configRows = await db
      .select()
      .from(approvalConfigs)
      .where(eq(approvalConfigs.isActive, true));

    const configByGroup: Record<string, typeof configRows[0]> = {};
    for (const row of configRows) {
      if (!configByGroup[row.groupName]) {
        configByGroup[row.groupName] = row;
      }
    }

    let fallbackUsers: Array<{ id: string; name: string; department: string }> | null = null;

    for (const groupName of groupNames) {
      const config = configByGroup[groupName];
      if (config) {
        result.push({ userId: config.userId, name: config.userName, groupName });
      } else {
        if (!fallbackUsers) {
          fallbackUsers = await db
            .select({ id: users.id, name: users.name, department: users.department })
            .from(users)
            .where(eq(users.role, 'group_approver'));
        }
        const matched = fallbackUsers.find(u => u.department.toLowerCase().includes(groupName));
        if (matched) {
          result.push({ userId: matched.id, name: matched.name, groupName });
        } else if (fallbackUsers.length > 0) {
          result.push({ userId: fallbackUsers[0].id, name: fallbackUsers[0].name, groupName });
        }
      }
    }

    return result;
  }

  /**
   * 获取最终确认人
   * 优先查 approval_group_configs confirmation 组，降级到 admin
   */
  async getConfirmationApprover(): Promise<ConfirmationInfo> {
    const configRows = await db
      .select()
      .from(approvalConfigs)
      .where(and(eq(approvalConfigs.groupName, 'confirmation'), eq(approvalConfigs.isActive, true)));

    if (configRows.length > 0) {
      return { userId: configRows[0].userId, name: configRows[0].userName };
    }

    const admins = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.role, 'admin'));

    if (admins.length === 0) {
      throw new Error('未找到最终确认人');
    }

    return { userId: admins[0].id, name: admins[0].name };
  }
}
