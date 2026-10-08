import { defineConfig, env } from 'prisma/config';
import './src/config';

/*
 * Prisma 7 reads connection URLs from this CLI configuration, not schema.prisma.
 * Loading the application config also loads BE/.env without overriding secrets
 * provided by the deployment environment.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'ts-node src/scripts/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
});
