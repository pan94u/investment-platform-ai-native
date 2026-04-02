import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),            // initiator | supervisor | group_approver | admin | viewer
  department: varchar('department', { length: 100 }).notNull(),
  domain: varchar('domain', { length: 50 }).notNull(),         // smart_living | industrial_finance | health
  email: varchar('email', { length: 200 }),                    // nullable
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
