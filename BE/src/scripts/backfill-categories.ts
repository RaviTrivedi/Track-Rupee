import { prisma } from '../config/database';
import { config } from '../config';
import { createDefaultCategories } from '../modules/categories/category.defaults';

async function main(): Promise<void> {
  try {
    if (config.nodeEnv !== 'development' || process.env.NODE_ENV !== 'development') {
      throw new Error('Development environment required.');
    }
    const userId = process.argv[2];
    if (!userId) {
      console.info(await prisma.user.findMany({ select: { id: true, _count: { select: { categories: true } } } }));
      return;
    }
    // Explicit target only: never recreate deleted defaults during GET or login.
    const count = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new Error('User not found.');
      return createDefaultCategories(tx, user.id);
    });
    console.info(`Added ${count.count} missing default categories.`);
    console.info(await prisma.category.groupBy({ by: ['type'], where: { userId }, _count: true }));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error('Category backfill failed. Check the development database and user ID.');
  process.exitCode = 1;
});
