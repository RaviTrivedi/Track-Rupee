# PostgreSQL and Prisma foundation

## Installation and initialization

Run commands from `BE`. This repository already includes the configuration and schema; do not rerun `init` over them.

Use Node 22.12+ or a newer supported LTS for the full toolchain. The installed Prisma CLI includes a dependency requiring Node 22+, although schema validation, generation, type checking, and the connection check succeeded on the current Node 20.19 environment.

```sh
npm install @prisma/client@7 @prisma/adapter-pg@7 pg@8
npm install -D prisma@7 @types/pg@8

# For a new, uninitialized backend only:
npx prisma init --datasource-provider postgresql --output ../src/generated/prisma
```

Prisma 7 uses a driver adapter and configures the CLI database URL in `prisma.config.ts`. The generated client explicitly uses CommonJS to match this backend. It is generated into `src/generated/prisma`, ignored by Git, and compiled into `dist/generated/prisma` with the application. Both `prisma` and `@prisma/client` should be upgraded together. Commit `package-lock.json` and use `npm ci` for repeatable installs.

## Connection setup

Create a PostgreSQL database named `trackrupee` using your local PostgreSQL installation or provider. Set this value in `BE/.env`, substituting your credentials:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trackrupee?schema=public
```

This is a local example, not a production credential. URL-encode special characters in credentials. Use the TLS settings required by your database provider; do not disable certificate verification. `.env` is ignored by Git and existing process variables take precedence. Existing local credentials are preserved during setup.

`src/config/index.ts` validates configured URLs. Starting the server or database check requires the URL; importing the Express app now requires DATABASE_URL, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET for auth; tests supply test-only settings and mock persistence. Prisma CLI reads the same environment through `prisma.config.ts`.

## Schema and relationships

The complete executable schema is [schema.prisma](schema.prisma).

| Model | Purpose and relationships |
| --- | --- |
| `User` | Profile and ownership root. Owns accounts, categories, transactions, and budgets. The auth migration adds passwordHash and case-insensitive email uniqueness. Legacy users may have no password; new registrations always hash passwords. See [auth setup](../docs/auth.md). |
| `Account` | A cash, bank, card, or wallet account belonging to one user. Contains currency and an opening balance. Has many transactions. Current balance is opening balance plus income minus expenses. |
| `Category` | A user-owned income or expense label. Has many transactions and budgets. Names are unique within a user's category type. |
| `Transaction` | An income or expense event with amount and occurrence timestamp. Belongs to one user, account, and category. Currency comes from the account. |
| `Budget` | A category spending limit for a user, currency, and explicit time interval. Multiple periods are supported without assuming a particular calendar month. |

All models use UUID primary keys and `createdAt`/`updatedAt` timestamps. `@updatedAt` is maintained by Prisma; raw SQL updates must maintain it explicitly. PostgreSQL timestamps include time zones. Budget windows are start-inclusive and end-exclusive to avoid counting boundary transactions twice.

`TransactionType` and `CategoryType` each distinguish `INCOME` and `EXPENSE`; `AccountType` supports `CASH`, `BANK`, `CARD`, and `WALLET`.

Composite foreign keys include `userId`, enforcing that a transaction's account/category and a budget's category belong to that same user even for direct database writes. Restrictive deletes prevent removing users/accounts/categories while dependent financial records exist. Archive accounts/categories instead of deleting their history. Future queries must still scope all reads and writes by the authorized user; foreign keys are not authentication.

Money uses `Decimal(19,2)` rather than floating point. Pass decimal strings or `Prisma.Decimal` when writing and return strings at the API boundary to avoid precision loss. This foundation supports two-decimal currencies such as INR; it does not implement currency conversion or account transfers. Do not sum different currencies. Account currency should become immutable once transactions exist.

Indexes support per-user timelines, account/category histories, active account lists, and budget period searches. Unique constraints also provide indexes, so separate duplicate indexes are unnecessary.

### Rules for future write services

Before introducing write APIs, validate positive transaction/budget amounts, `endsAt > startsAt`, ISO currency codes, normalized emails/category names, and matching transaction/category types. Budgets must use expense categories and aggregate only matching-currency accounts. Distinct overlapping budget periods are currently allowed; the unique constraint blocks only identical periods for the same category/currency. Decide overlap policy before budget creation endpoints are added.

These are documented application invariants, not all enforced by the Prisma schema. Prisma schema syntax does not express SQL CHECK constraints or cross-table type rules. Add appropriate database CHECK constraints to reviewed migrations for positive amounts and date ordering before accepting real writes. No write endpoints are included in this step.

## Generate and migrate

```sh
# Validate the schema; this does not connect to PostgreSQL.
npm run db:validate

# Generate the typed client; rerun after schema changes.
npx prisma generate

# Create and apply the first migration to your DEVELOPMENT database.
npx prisma migrate dev --name init

# Verify connectivity with a read-only SELECT 1.
npm run db:check
```

`migrate dev` needs a development database and permission to create a shadow database (or a separately configured shadow database). Do not point it at production. Commit the generated `prisma/migrations/` files. This setup does not automatically apply migrations to the database in your `.env`.

For review before applying, use `npx prisma migrate dev --name init --create-only`, inspect the generated SQL, then run `npx prisma migrate dev`. Add any desired CHECK constraints to that first migration before applying it. Prisma 7 does not automatically generate the client after migrations; generation is an explicit step and also runs during `npm run build`.

For deployments, run `npm ci`, `npm run build`, and `npm run db:deploy` in the build/release environment with Prisma CLI installed. Then prune development dependencies and run `npm start`. `migrate deploy` applies committed migrations; it does not generate them or require a shadow database. Use a migration database role with DDL permissions and a narrower application role in production.

## Shared client and shutdown

Import `prisma` from `src/config/database.ts` in future services. One process shares one client and PostgreSQL pool; development caches it on `globalThis`. The adapter uses a maximum of ten connections with bounded connection/statement timeouts. Adjust the pool limit to your database's connection budget and number of application replicas.

`server.ts` stops accepting requests and waits for active requests to finish before calling `await prisma.$disconnect()` through its shutdown promise. The ten-second deadline covers draining and disconnecting. Do not disconnect after individual HTTP requests, because that closes the shared pool. Standalone scripts, such as `src/scripts/check-db.ts`, disconnect in `finally` so connections do not keep the process alive.

The existing `/health` endpoint remains a process liveness check. `npm run db:check` runs the tagged, parameterized query `prisma.$queryRaw\`SELECT 1 AS ok\`` and reports success/failure without printing credentials. It verifies connectivity, not migration state; use `db:status` to inspect migration state. It neither creates nor changes records.

## Command reference

| Command | Purpose |
| --- | --- |
| `npx prisma format` | Format the schema |
| `npm run db:validate` | Validate schema and configuration |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate -- --name descriptive_change` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations in deployments |
| `npm run db:status` | Compare migration history with the database |
| `npm run db:studio` | Open Prisma's database editor; edits change actual data |
| `npm run db:check` | Run the read-only connectivity check |

Avoid `db push` for the normal migration workflow because it does not produce migration history. `migrate reset` deletes data and is only appropriate for disposable development databases.

References: [Prisma 7 setup](https://www.prisma.io/docs/orm/v7), [client generator options](https://github.com/prisma/web/blob/main/apps/docs/content/docs/orm/v7/prisma-schema/overview/generators.mdx), and [Prisma config](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).
