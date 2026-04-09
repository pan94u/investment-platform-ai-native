import { mysqlTable, varchar, text, timestamp, int } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const attachments = mysqlTable('inv_attachments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  filingId: varchar('filing_id', { length: 36 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  fileSize: int('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  uploadedBy: varchar('uploaded_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
