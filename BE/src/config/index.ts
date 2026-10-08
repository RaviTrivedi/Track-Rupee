import dotenv from 'dotenv';
import path from 'node:path';

/*
 * Resolve .env from the backend root in both src/ and compiled dist/ layouts.
 * Deployment-provided environment variables take precedence over the file.
 */
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV ?? 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production.');
}

const rawPort = process.env.PORT ?? '4000';
const port = Number(rawPort);
if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const host = process.env.HOST?.trim() ?? '0.0.0.0';
if (!host) throw new Error('HOST must not be empty.');

const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

for (const origin of corsOrigins) {
  let valid = false;
  try {
    const url = new URL(origin);
    valid = ['http:', 'https:'].includes(url.protocol) && url.origin === origin;
  } catch {
    valid = false;
  }
  if (!valid) throw new Error('CORS_ORIGINS must contain only HTTP(S) origins without paths.');
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl) {
  let valid = false;
  try {
    const url = new URL(databaseUrl);
    valid = ['postgresql:', 'postgres:'].includes(url.protocol) && Boolean(url.hostname) && url.pathname.length > 1;
  } catch {
    valid = false;
  }
  if (!valid) throw new Error('DATABASE_URL must be a PostgreSQL connection URL with a database name.');
}

export const config = Object.freeze({
  databaseUrl,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port,
  host,
  corsOrigins: Object.freeze(corsOrigins),
});
