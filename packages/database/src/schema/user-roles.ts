import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/** 用户角色配置（admin 后台配置） */
export const userRoles = pgTable('user_roles', {
  empCode: varchar('emp_code', { length: 20 }).primaryKey(),  // 员工工号
  role: varchar('role', { length: 20 }).notNull(),             // initiator | admin | viewer
  createdBy: varchar('created_by', { length: 20 }).notNull(),  // 配置人工号
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
