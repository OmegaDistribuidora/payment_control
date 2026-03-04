import dotenv from 'dotenv';

dotenv.config();

function parsePort(value: string | undefined, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
}

function parseOrigins(value: string | undefined): string[] {
  const raw = String(value ?? '').trim();
  if (!raw) return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT, 8081),
  timezone: process.env.TZ ?? 'America/Fortaleza',
  corsAllowedOrigins: parseOrigins(process.env.CORS_ALLOWED_ORIGINS),
  readOnly: parseBoolean(process.env.APP_READ_ONLY, false),
  database: {
    host: process.env.PGHOST ?? 'localhost',
    port: parsePort(process.env.PGPORT, 5432),
    database: process.env.PGDATABASE ?? 'payment_control',
    user: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD ?? 'postgres',
    sslMode: process.env.PGSSLMODE ?? 'disable',
  },
};

if (!process.env.TZ) {
  process.env.TZ = env.timezone;
}
