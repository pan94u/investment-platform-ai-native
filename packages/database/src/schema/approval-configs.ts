import { pgTable, text, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';

export const approvalConfigs = pgTable('approval_group_configs', {
  id: text('id').primaryKey(),
  groupName: varchar('group_name', { length: 30 }).notNull(),  // finance|hr|strategy|legal|audit|confirmation
  userId: text('user_id').notNull(),
  userName: varchar('user_name', { length: 100 }).notNull(),
  userEmail: varchar('user_email', { length: 200 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
