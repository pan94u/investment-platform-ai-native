import { mysqlTable, varchar, text, timestamp, int } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const approvals = mysqlTable('inv_approvals', {
  id: varchar('id', { length: 36 }).primaryKey(),
  filingId: varchar('filing_id', { length: 36 }).notNull(),
  approverId: varchar('approver_id', { length: 36 }).notNull(),
  approverName: varchar('approver_name', { length: 100 }).notNull(),

  // 审批阶段与层级
  stage: varchar('stage', { length: 20 }).notNull().default('business'),
  level: int('level').notNull(),
  groupName: varchar('group_name', { length: 20 }),

  // 审批结果
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  comment: text('comment'),

  // 时间
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  decidedAt: timestamp('decided_at'),

  // 辅助
  reassignedFrom: varchar('reassigned_from', { length: 36 }),
  externalTodoId: varchar('external_todo_id', { length: 100 }),
});
