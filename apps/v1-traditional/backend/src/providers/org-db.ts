import { eq, and, inArray } from 'drizzle-orm';
import { users } from '@filing/database';
import type { ApprovalGroupName } from '@filing/shared';
import { db } from '../lib/db.js';
import type { OrgProvider, ApproverChainContext, ApproverInfo, GroupApproverInfo, ConfirmationInfo } from './types.js';

/**
 * 从本地 users 表查审批链
 *
 * 业务侧审批链逻辑:
 *   发起人 → 直线上级(supervisor) → 平台主(admin)
 *   同人捏合: 如果相邻两级是同一人，合并为一级
 *
 * 集团审批组:
 *   按 groupName 查对应 group_approver 角色用户
 *
 * 最终确认:
 *   固定为 strategy 组的默认审批人（曹智）
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
   * PoC: 按 role=group_approver 查用户，department 匹配 groupName
   * 生产: 由管理员在 approval_group_configs 表配置
   */
  async getGroupApprovers(groupNames: readonly ApprovalGroupName[]): Promise<readonly GroupApproverInfo[]> {
    if (groupNames.length === 0) return [];

    // PoC: 从 users 表中查找 group_approver 角色，按 department 映射 groupName
    const groupApproverUsers = await db
      .select({ id: users.id, name: users.name, department: users.department })
      .from(users)
      .where(eq(users.role, 'group_approver'));

    // 为每个请求的 groupName 分配审批人
    const result: GroupApproverInfo[] = [];
    for (const groupName of groupNames) {
      // 尝试按 department 匹配
      const matched = groupApproverUsers.find(u => u.department.toLowerCase().includes(groupName));
      if (matched) {
        result.push({ userId: matched.id, name: matched.name, groupName });
      } else if (groupApproverUsers.length > 0) {
        // fallback: 使用第一个 group_approver
        result.push({ userId: groupApproverUsers[0].id, name: groupApproverUsers[0].name, groupName });
      }
    }

    return result;
  }

  /**
   * 获取最终确认人
   * PoC: 查 admin 角色用户中的第一个（代表曹智）
   * 生产: 配置化
   */
  async getConfirmationApprover(): Promise<ConfirmationInfo> {
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
