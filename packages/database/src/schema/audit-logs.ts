import { mysqlTable, varchar, text, timestamp, json } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const auditLogs = mysqlTable('inv_audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 30 }).notNull(),
  entityId: text('entity_id').notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  userName: varchar('user_name', { length: 100 }).notNull(),
  detail: json('detail').notNull().default({}),
  fieldSource: json('field_source'),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
