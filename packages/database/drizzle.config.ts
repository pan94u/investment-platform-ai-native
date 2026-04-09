import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/schema/users.ts',
    './src/schema/filings.ts',
    './src/schema/approvals.ts',
    './src/schema/attachments.ts',
    './src/schema/audit-logs.ts',
    './src/schema/approval-configs.ts',
    './src/schema/email-cc-configs.ts',
    './src/schema/user-roles.ts',
  ],
  out: './src/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST ?? '10.250.12.15',
    port: Number(process.env.DB_PORT ?? 3100),
    user: process.env.DB_USER ?? 'jbs_test',
    password: process.env.DB_PASS ?? 'l#1yCNYn8Qex',
    database: process.env.DB_NAME ?? 'jbs_haier2',
  },
});
