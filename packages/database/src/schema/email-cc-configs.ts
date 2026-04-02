import { pgTable, text, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';

export const emailCcConfigs = pgTable('email_cc_configs', {
  id: text('id').primaryKey(),
  groupName: varchar('group_name', { length: 30 }).notNull(),  // finance|hr|strategy|legal|audit
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
