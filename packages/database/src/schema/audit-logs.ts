import { pgTable, text, timestamp, varchar, jsonb } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 30 }).notNull(),    // filing | approval | attachment | user
  entityId: text('entity_id').notNull(),
  userId: text('user_id').notNull(),
  userName: varchar('user_name', { length: 100 }).notNull(),
  detail: jsonb('detail').notNull().default({}),
  fieldSource: jsonb('field_source'),                               // V3+: 字段来源标注
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
