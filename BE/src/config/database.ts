import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { config } from './index';

function createClient(): PrismaClient {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required for database access.');
  const adapter = new PrismaPg({
    connectionString: config.databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 5_000,
  });
  return new PrismaClient({ adapter });
}

const globalDatabase = globalThis as typeof globalThis & { prisma?: PrismaClient };

/*
 * Share one client/pool per process. The development cache also survives module
 * reloads; never create or disconnect a client per request. Prisma connects lazily.
 */
export const prisma = globalDatabase.prisma ?? createClient();
if (!config.isProduction) globalDatabase.prisma = prisma;
