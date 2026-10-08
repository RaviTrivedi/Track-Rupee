# Access and refresh authentication

The backend uses short-lived access JWTs and rotating refresh JWTs. No new npm dependencies are needed.

## Configuration

Set these in BE/.env or your deployment secret manager:

```dotenv
JWT_ACCESS_SECRET=<independent-random-secret-at-least-32-bytes>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<different-random-secret-at-least-32-bytes>
JWT_REFRESH_EXPIRES_IN=7d
```

Durations accept integer seconds or s/m/h/d suffixes. Access lifetimes are restricted to 1–60 minutes, refresh lifetimes to 1–90 days. The old JWT_SECRET and JWT_ACCESS_TOKEN_TTL_SECONDS names are replaced. Local setup preserves the previous access key under the new name and generates a separate refresh key if missing; secrets are never printed. Existing access-only tokens lack the new token-type claim and require a fresh login.

To generate a key locally, run this twice and store the separate values privately:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

## Schema and migrations

[Complete schema](../prisma/schema.prisma) adds User.refreshTokens and a separate RefreshToken model:

- id: UUID and JWT jti, unique per issuance.
- tokenHash: unique SHA-256 fingerprint; no plaintext bearer token is stored.
- userId: owner foreign key, with cascade cleanup when that user is deleted.
- familyId: stable UUID for a login/device session across rotations.
- expiresAt: absolute session expiry, unchanged by rotation.
- revokedAt: null while usable, set on rotation/revocation.
- createdAt and updatedAt: audit timestamps.

Indexes support user revocation, family revocation, unique hash lookup, and expiry cleanup. A separate table supports independent sessions for multiple devices. SHA-256 is appropriate for these cryptographically signed tokens with random identifiers; human passwords continue to use bcrypt.

A migration is included at prisma/migrations/20261006090000_refresh_tokens/migration.sql. From BE:

```sh
npm run db:deploy
npm run db:generate
npm run typecheck
npm test
npm run dev
```

For future schema changes, use `npm run db:migrate -- --name descriptive_change` on a development database and commit the migration. Do not regenerate the already supplied migration.

## Files

- src/config/auth.ts: separate secrets and validated lifetimes.
- src/modules/auth/auth.token.ts: JWT signing/verification, fixed algorithms, issuer/audience/type checks.
- src/utils/token-hash.ts: SHA-256 fingerprint and constant-time comparison.
- src/modules/auth/auth.session.ts: token persistence, atomic rotation, family revocation, and logout-all.
- src/modules/auth/auth.service.ts: register/login, transactional user/session creation.
- src/modules/auth/auth.controller.ts, auth.routes.ts, auth.validation.ts: HTTP responses, routes, Joi schemas.
- src/middleware/authenticate.ts: access-only Bearer authentication, current-user lookup.

The main router remains mounted at /api/auth. Existing error handling and response helpers are reused.

## API examples

Send Content-Type: application/json for request bodies. Passwords require at least 12 characters and no more than 72 UTF-8 bytes; they are not trimmed. Email/name normalization and duplicate handling remain unchanged.

### POST /api/auth/register

```json
{"name":"Asha Rao","email":"asha@example.com","password":"a-long-unique-passphrase"}
```

HTTP 201:

```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": "58d8dbdb-ae93-4e23-a2cc-a00a520499b7",
      "name": "Asha Rao",
      "email": "asha@example.com",
      "createdAt": "2026-10-06T10:00:00.000Z",
      "updatedAt": "2026-10-06T10:00:00.000Z"
    },
    "accessToken": "<access-jwt>",
    "refreshToken": "<refresh-jwt>"
  }
}
```

User creation and initial refresh storage commit together. No passwordHash or tokenHash appears in responses.

### POST /api/auth/login

```json
{"email":"asha@example.com","password":"a-long-unique-passphrase"}
```

HTTP 200 has the same data shape as registration and message "Login successful.". Each login creates a new independent session family. Unknown users, wrong passwords, and passwordless legacy users return the same 401 response.

### POST /api/auth/refresh-token

No access token is required, since it may already have expired:

```json
{"refreshToken":"<current-refresh-jwt>"}
```

HTTP 200:

```json
{
  "success": true,
  "message": "Tokens refreshed.",
  "data": {
    "accessToken": "<new-access-jwt>",
    "refreshToken": "<new-refresh-jwt>"
  }
}
```

Missing/malformed body returns 400. Invalid signature, expired token, missing database row, hash mismatch, or revoked token returns 401 with data null. An access token cannot be used as a refresh token, nor vice versa.

### GET /api/auth/me

Send `Authorization: Bearer <accessToken>`. Returns the public user under data.user, with no hash fields.

### POST /api/auth/logout

No access token is required:

```json
{"refreshToken":"<refresh-jwt>"}
```

HTTP 200:

```json
{"success":true,"message":"Logout successful. Discard your tokens.","data":null}
```

Revokes the supplied token's entire device family, including a successor if the supplied token was already rotated. Repeated logout with a still-valid signed token succeeds. Expired/invalid JWTs return 401; clients should still discard their local credentials.

### POST /api/auth/logout-all

Protected by `Authorization: Bearer <accessToken>`; no body required.

```json
{"success":true,"message":"All sessions logged out. Discard your tokens.","data":null}
```

Revokes every existing unrevoked refresh token belonging to the authenticated user. Other users are unaffected. A new login after this operation creates a new session.

## Rotation and concurrency

1. Verify the refresh JWT using its separate secret, audience, token type, expiry, and UUID claims.
2. Begin a transaction and lock the owning User row in PostgreSQL.
3. Match JWT jti/userId to the database row and compare its SHA-256 fingerprint.
4. If active and unexpired, revoke the old row and create a new token row in the same family, atomically.
5. Commit and return the new token pair. A failed insert rolls back the old-token revocation.
6. If an already-revoked token is replayed, revoke the family and commit that revocation before returning 401.

All session mutations use the same per-user lock, including login issuance and logout-all. New registration owns its uncommitted user row. This prevents concurrent rotations/revocations from bypassing each other across server processes.

Clients must serialize refresh requests and atomically replace their stored token pair. Two simultaneous refreshes using the same token trigger strict replay detection: one may succeed, but the replay revokes the resulting family. A lost refresh response may therefore require login again; there is no retry grace period.

Rotation retains the original absolute session deadline (7 days by default). Keep revoked ancestors until that deadline for replay detection. An operations cleanup job may delete rows with expiresAt in the past; do not immediately delete revoked, unexpired ancestors. No cleanup scheduler is added in this step.

## Boundaries and testing

Logout/replay/logout-all prevent further refresh, but existing access tokens remain valid until their short expiry. The client must discard both tokens. This implementation does not promise immediate access-token revocation.

Responses use no-store headers, token operations are rate limited, and request logging excludes bodies and authorization headers. Use HTTPS and platform-appropriate secure credential storage. Rate limits currently use a per-process store; configure a shared store or gateway limit for multiple replicas.

`npm test` runs mocked-persistence HTTP tests. The opt-in PostgreSQL test uses TEST_DATABASE_URL pointing at a migrated disposable test database and checks real concurrent rotation and revocation. It creates temporary users and removes those users in finally; never point it at production.

Rotation and replay detection follow the approach described in [RFC 9700 §4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2).
