import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const userRoles = mysqlTable('inv_user_roles', {
  empCode: varchar('emp_code', { length: 20 }).primaryKey(),
  role: varchar('role', { length: 20 }).notNull(),
  createdBy: varchar('created_by', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
