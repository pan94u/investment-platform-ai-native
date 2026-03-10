import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://filing:filing_dev@localhost:5401/filing_v1';

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
export { client };
