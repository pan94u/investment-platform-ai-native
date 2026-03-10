import { pgTable, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';
import { filings } from './filings.js';
import { users } from './users.js';

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  filingId: text('filing_id').notNull().references(() => filings.id),
  filename: varchar('filename', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
