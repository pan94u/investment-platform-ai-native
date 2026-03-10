import { db, client } from '../connection.js';
import { users, filings, approvals } from '../schema/index.js';
import { seedUsers, seedFilings, seedApprovals } from './data.js';

async function seed() {
  console.log('Seeding database...');

  // 清理顺序：先删子表，再删主表
  await db.delete(approvals);
  await db.delete(filings);
  await db.delete(users);

  // 插入用户
  await db.insert(users).values([...seedUsers]);
  console.log(`  Inserted ${seedUsers.length} users`);

  // 插入备案
  await db.insert(filings).values([...seedFilings]);
  console.log(`  Inserted ${seedFilings.length} filings`);

  // 插入审批
  await db.insert(approvals).values([...seedApprovals]);
  console.log(`  Inserted ${seedApprovals.length} approvals`);

  console.log('Seed completed.');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
