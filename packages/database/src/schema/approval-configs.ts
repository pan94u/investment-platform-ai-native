import { mysqlTable, varchar, timestamp, boolean } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const approvalConfigs = mysqlTable('inv_approval_group_configs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  groupName: varchar('group_name', { length: 30 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  userName: varchar('user_name', { length: 100 }).notNull(),
  userEmail: varchar('user_email', { length: 200 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
