import { Pool } from 'pg';
import { env } from '../config/env.js';

const useSsl = env.database.sslMode.toLowerCase() !== 'disable';

export const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.database,
  user: env.database.user,
  password: env.database.password,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 4,
  min: 0,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 10_000,
});

export async function closePool(): Promise<void> {
  await pool.end();
}
