import { config } from '../config';
import { prisma } from '../config/database';
import { registerSchema } from '../modules/auth/auth.validation';
import { createDefaultCategories } from '../modules/categories/category.defaults';
import { hashPassword } from '../utils/password';

async function main(): Promise<void> {
  // Prisma connects lazily; require explicit development mode before any DB query.
  if (process.env.NODE_ENV !== 'development' || config.nodeEnv !== 'development') {
    throw new Error('Seed requires NODE_ENV=development.');
  }
  const input = registerSchema.validate({
    name: process.env.SEED_DEMO_NAME ?? 'TrackRupee Demo',
    email: process.env.SEED_DEMO_EMAIL,
    password: process.env.SEED_DEMO_PASSWORD,
  }, { abortEarly: false });
  if (input.error) {
    throw new Error('Set valid SEED_DEMO_EMAIL and SEED_DEMO_PASSWORD (12 characters minimum, 72 UTF-8 bytes maximum), and optionally SEED_DEMO_NAME.');
  }
  try {
    const { name, email, password } = input.value;
    const passwordHash = await hashPassword(password);
    const result = await prisma.$transaction(async (tx) => {
      /*
       * Insert-only semantics also protect a concurrent registration or seed.
       * Never update an existing user's name, password, or other profile fields.
       */
      const inserted = await tx.user.createMany({ data: [{ name, email, passwordHash }], skipDuplicates: true });
      const user = await tx.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true },
      });
      if (!user) throw new Error('Demo user lookup failed.');
      const categories = await createDefaultCategories(tx, user.id);
      return { users: inserted.count, categories: categories.count };
    });
    console.info(`Development seed complete: ${result.users} user(s) and ${result.categories} categories added. Existing records preserved.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  // Avoid logging database errors or validation contexts that may expose secrets.
  console.error('Seed failed. Check NODE_ENV=development, demo credentials, DATABASE_URL, and applied migrations. No credentials were logged.');
  process.exitCode = 1;
});
