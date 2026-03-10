import { pgTable, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';
import { filings } from './filings.js';
import { users } from './users.js';

export const approvals = pgTable('approvals', {
  id: text('id').primaryKey(),
  filingId: text('filing_id').notNull().references(() => filings.id),
  approverId: text('approver_id').notNull().references(() => users.id),
  approverName: varchar('approver_name', { length: 100 }).notNull(),
  level: integer('level').notNull(),                 // 1=直属上级, 2=集团审批
  status: varchar('status', { length: 20 }).notNull().default('pending'),  // pending | approved | rejected
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
});
