import { eq, and } from 'drizzle-orm';
import { users, approvalConfigs } from '@filing/database';
import type { ApprovalGroupName } from '@filing/shared';
import { db } from '../lib/db.js';
import type { OrgProvider, ApproverChainContext, ApproverInfo, GroupApproverInfo, ConfirmationInfo } from './types.js';

/**
 * 从本地 users 表 + approval_group_configs 表查审批链
 *
 * 业务侧审批链逻辑:
 *   发起人 → 直线上级(supervisor) → 平台主(admin)
 *   同人捏合: 如果相邻两级是同一人，合并为一级
 *
 * 集团审批组:
 *   优先查 approval_group_configs 表（isActive=true），降级到 users 表
 *
 * 最终确认:
 *   优先查 approval_group_configs where groupName='confirmation'，降级到 admin 用户
 */
export class DatabaseOrgProvider implements OrgProvider {
  /**
   * 获取业务侧审批链（逐级上溯）
   * PoC: supervisor(同域) → admin 的简化模型
   * 生产: 对接组织中心获取真实汇报链
   */
  async getBusinessApproverChain(ctx: ApproverChainContext): Promise<readonly ApproverInfo[]> {
    const chain: ApproverInfo[] = [];

    // L1: 同域 supervisor
    const sameDomainSupervisors = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.role, 'supervisor'), eq(users.domain, ctx.creatorDomain)));

    const allSupervisors = sameDomainSupervisors.length > 0
      ? sameDomainSupervisors
      : await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, 'supervisor'));

    if (allSupervisors.length === 0) {
      throw new Error('未找到上级审批人');
    }

    const supervisor = allSupervisors[0];
    // 排除发起人自己作为审批人
    if (supervisor.id !== ctx.creatorId) {
      chain.push({ userId: supervisor.id, name: supervisor.name, level: chain.length + 1 });
    }

    // L2: 平台主 (admin) — 如果与 supervisor 不同且不是发起人
    const admins = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.role, 'admin'));

    if (admins.length > 0) {
      const admin = admins[0];
      const lastInChain = chain[chain.length - 1];
      // 同人捏合: 如果 admin === supervisor 或 admin === creator，跳过
      if (admin.id !== ctx.creatorId && (!lastInChain || admin.id !== lastInChain.userId)) {
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
   * 优先查 approval_group_configs 表（isActive=true），降级到 users 表
   */
  async getGroupApprovers(groupNames: readonly ApprovalGroupName[]): Promise<readonly GroupApproverInfo[]> {
    if (groupNames.length === 0) return [];

    const result: GroupApproverInfo[] = [];

    // 先查配置表
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

    // 降级用：查 users 表中的 group_approver
    let fallbackUsers: Array<{ id: string; name: string; department: string }> | null = null;

    for (const groupName of groupNames) {
      const config = configByGroup[groupName];
      if (config) {
        result.push({ userId: config.userId, name: config.userName, groupName });
      } else {
        // 降级到 users 表
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
   * 优先查 approval_group_configs where groupName='confirmation'
   * 降级到 admin 用户
   */
  async getConfirmationApprover(): Promise<ConfirmationInfo> {
    // 先查配置表
    const configRows = await db
      .select()
      .from(approvalConfigs)
      .where(and(eq(approvalConfigs.groupName, 'confirmation'), eq(approvalConfigs.isActive, true)));

    if (configRows.length > 0) {
      return { userId: configRows[0].userId, name: configRows[0].userName };
    }

    // 降级到 admin
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
