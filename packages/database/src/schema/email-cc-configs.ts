import { mysqlTable, varchar, timestamp, boolean } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const emailCcConfigs = mysqlTable('inv_email_cc_configs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  groupName: varchar('group_name', { length: 30 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
