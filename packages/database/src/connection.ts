import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema/index.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '10.250.12.15',
  port: Number(process.env.DB_PORT ?? 3100),
  user: process.env.DB_USER ?? 'jbs_test',
  password: process.env.DB_PASS ?? 'l#1yCNYn8Qex',
  database: process.env.DB_NAME ?? 'jbs_haier2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
});

export const db = drizzle(pool, { schema, mode: 'default' });
export { pool as client };
