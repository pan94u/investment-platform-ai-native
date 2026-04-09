import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, client } from './connection.js';

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './src/migrations' });
  console.log('Migrations completed.');
  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
