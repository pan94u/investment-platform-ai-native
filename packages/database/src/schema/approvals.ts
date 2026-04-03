import { pgTable, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';
import { filings } from './filings.js';

export const approvals = pgTable('approvals', {
  id: text('id').primaryKey(),
  filingId: text('filing_id').notNull().references(() => filings.id),
  approverId: text('approver_id').notNull(), // emp_code，不再引用本地 users 表
  approverName: varchar('approver_name', { length: 100 }).notNull(),

  // 审批阶段与层级
  stage: varchar('stage', { length: 20 }).notNull().default('business'),  // business | group | confirmation
  level: integer('level').notNull(),                                       // 业务侧: 1,2,3...  集团/确认: 1
  groupName: varchar('group_name', { length: 20 }),                        // 仅 group 阶段: finance | hr | strategy | legal | audit

  // 审批结果
  status: varchar('status', { length: 20 }).notNull().default('pending'),  // pending | approved | rejected | acknowledged
  comment: text('comment'),

  // 时间
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),

  // 辅助
  reassignedFrom: text('reassigned_from'),       // 改派前的原审批人 ID
  externalTodoId: text('external_todo_id'),       // 飞书等外部系统的待办 ID
});
