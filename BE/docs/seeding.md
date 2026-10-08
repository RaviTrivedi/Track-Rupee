# Development seed

In BE/.env, set your own demo credentials:

```dotenv
NODE_ENV=development
SEED_DEMO_NAME=TrackRupee Demo
SEED_DEMO_EMAIL=your-demo-email@example.com
SEED_DEMO_PASSWORD=<your-own-password>
```

Use at least 12 characters and at most 72 UTF-8 bytes for the password, matching registration validation. Name is optional. Point DATABASE_URL at your development database; the script rejects any environment other than explicitly configured development. Environment mode cannot identify a mistakenly configured production database URL.

From BE:

```sh
npm run db:deploy
npm run db:generate
npm run db:seed
```

Prisma 7 configures the command in migrations.seed in prisma.config.ts. Seeding runs explicitly through `prisma db seed`, not automatically during migrations. The existing ts-node runner is reused; no dependencies were added.

Shared definitions live in `src/modules/categories/category.defaults.ts`: six income and ten expense categories, each with a canonical kebab-case Lucide icon, hex color, and isDefault=true. `createDefaultCategories` takes the caller's Prisma transaction. Registration creates the user, their categories, and initial refresh-token session atomically. Only the standalone demo seed is development-only; real registration gets defaults in every environment.

The seed hashes the environment password using the same bcrypt cost as registration. It uses createMany with skipDuplicates for both user and categories. Existing users keep their password and profile; existing category names, icons, colors, archive state, and isDefault values are preserved. Case-insensitive conflicts are handled by the existing database indexes. Only missing name/type pairs are added, including on concurrent runs. Changing SEED_DEMO_PASSWORD does not reset an existing password; changing the email targets a different demo user. Renaming/deleting a default category means a later seed can add that original name/type again.

The migration adds isDefault with default false so existing categories are not relabeled. This field records the origin of new default categories; it does not make them global or read-only. The existing CRUD validators do not accept isDefault from clients.

The seed creates no access/refresh tokens and disconnects Prisma after its database work. It does not print credentials. No demo credentials are supplied automatically, and no existing users other than the selected email are backfilled.

Reference: [Prisma 7 seeding](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding).
