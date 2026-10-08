# TrackRupee backend

See [Monthly Budget APIs](docs/budgets.md) for Kolkata month boundaries and live spending progress.

See [Transaction APIs](docs/transactions.md) for atomic balance updates, filters, pagination, and concurrency tests.

See [Account APIs](docs/accounts.md) for manual INR money sources, decimal balances, and examples.

See [development seeding](docs/seeding.md) for the demo user and shared default categories.

Category CRUD is documented in [Category API](docs/categories.md), including ownership rules and request/response examples.

Express 5 and strict TypeScript backend with Prisma, PostgreSQL, and JWT authentication. See [database setup](prisma/README.md) for the model design and [authentication setup](docs/auth.md) for installation, routes, request/response examples, and the auth flow. Other business endpoints are deferred.

## Structure

```text
BE/
  src/
    config/index.ts
    middleware/
      error-handler.ts
      not-found.ts
    modules/health/health.routes.ts
    utils/
      api-response.ts
      app-error.ts
      async-handler.ts
    app.ts
    server.ts
  tests/foundation.test.cjs
  .env.example
  .gitignore
  nodemon.json
  package.json
  package-lock.json
  tsconfig.json
```

- `config/`: loads and validates environment settings once, failing startup for invalid values. Application code reads the exported config instead of scattering `process.env` access.
- `middleware/`: shared HTTP behavior, currently 404 and centralized error handling.
- `modules/`: groups code by business feature. Health needs only a router today. Future `auth/`, `users/`, `transactions/`, `categories/`, `budgets/`, and `accounts/` folders can hold their own routes, controllers, services, and validation as needed.
- `utils/`: small reusable helpers for response envelopes, expected errors, and async controllers.
- `tests/`: HTTP and configuration regression checks using Node's built-in test runner.
- `app.ts`: composes middleware and routes without opening a port, allowing isolated tests.
- `server.ts`: owns the listener and bounded graceful shutdown.

Feature grouping keeps related changes together as the API grows. There are no empty feature folders, repository abstractions, dependency injection containers, or placeholder services. Extract layers when real business logic needs them.

## Setup

Use a supported Node.js LTS release for deployment; the technical minimum is Node 20.19. npm is required.

```powershell
cd BE
npm ci
Copy-Item .env.example .env
# Set DATABASE_URL and generate JWT_ACCESS_SECRET and JWT_REFRESH_SECRET as described in docs/auth.md.
npm run db:deploy
npm run db:generate
npm run dev
```

On macOS/Linux, use `cp .env.example .env`. Nodemon restarts the TypeScript server when source or `.env` changes. `ts-node` is development-only; production runs compiled JavaScript.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run with nodemon and ts-node |
| `npm run typecheck` | Strict type checking without emitting files |
| `npm run build` | Compile into `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | Build and run foundation tests |

TypeScript uses Node16 module resolution with package type `commonjs`, so source imports compile consistently to CommonJS. No runtime aliases or mixed ESM/CommonJS application files are required. Tests use `.cjs` explicitly.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `HOST` | `0.0.0.0` | Listen address |
| `PORT` | `4000` | Integer port from 1 to 65535 |
| `CORS_ORIGINS` | empty | Comma-separated exact browser origins |

`.env` is loaded from the backend root. Existing process variables win. An empty origin list grants no cross-origin browser access; `.env.example` includes local frontend origins. Supply explicit HTTPS frontend origins in deployment. Origins must not contain paths or trailing slashes. Credentials are disabled until an authentication strategy is chosen. CORS controls browser access, not authorization; clients without an Origin header can still call the API.

## API conventions

`GET /health` returns HTTP 200:

```json
{
  "success": true,
  "message": "TrackRupee API is healthy.",
  "data": { "status": "ok", "timestamp": "2026-10-05T00:00:00.000Z", "uptime": 12.34 }
}
```

This is a process liveness endpoint, not a future database readiness check. Timestamps and uptime are generated per request.

Errors use their appropriate HTTP status and the same envelope:

```json
{ "success": false, "message": "Route not found.", "data": null }
```

Throw `new AppError('Safe client-facing explanation.', 400)` for expected failures. All server errors return a generic message with no stack traces. Malformed JSON returns 400, payloads over 100 KB return 413, and unsupported body encoding returns 415. Register future routers before the 404 handler. The global error handler must remain last.

Express 5 forwards async route rejections automatically ([official documentation](https://expressjs.com/en/guide/error-handling/)). The optional `asyncHandler` utility is included as a consistent wrapper for future async controllers.

## Deployment baseline

```sh
npm ci
npm test
npm prune --omit=dev
```

Set `NODE_ENV=production`, `PORT`, `CORS_ORIGINS`, and `DATABASE_URL` through the deployment environment, then run `npm start`. The test command generates Prisma Client and builds `dist/` before development dependencies are pruned. Run `npm run db:deploy` in a release job with the Prisma CLI installed before pruning development dependencies. Alternatively run `npm run build` explicitly in a build stage and ship `dist/` with production dependencies. Prisma CLI configuration requires DATABASE_URL even for generation; an unused local placeholder is sufficient for builds that do not connect to a database.

Helmet adds security headers; Express identification is disabled. Morgan logs method, path, status, response size, and duration, excluding query strings, headers, and bodies. Keep secrets out of URL paths too. Unexpected errors produce a generic server log to avoid leaking financial data; add structured, redacted diagnostics when business modules arrive.

SIGINT/SIGTERM stop new connections and allow up to 10 seconds for active requests to finish. Use a process supervisor for restarts and a TLS-terminating deployment platform or reverse proxy. Proxy trust remains disabled; configure it for the specific infrastructure before relying on forwarded IPs. This is the backend foundation, not a complete finance application security implementation.
