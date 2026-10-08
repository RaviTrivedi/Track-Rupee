import { prisma } from '../config/database';

async function main(): Promise<void> {
  try {
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    if (result[0]?.ok !== 1) throw new Error('Unexpected database response.');
    console.info('PostgreSQL connection verified.');
  } catch {
    // Connection errors can contain credentials or host details; do not print them.
    console.error('Database check failed. Check DATABASE_URL and PostgreSQL availability.');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error('Database client cleanup failed.');
  process.exitCode = 1;
});
