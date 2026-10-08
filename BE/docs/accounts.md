# Manual INR accounts

These accounts are user-maintained money sources, not bank connections. All endpoints require `Authorization: Bearer <accessToken>`. The router is mounted at `/api/accounts`; implementation is in `src/modules/accounts/` with routes, controller, service, validation, and types files.

## Setup

From BE, apply the included migration and regenerate Prisma Client:

```sh
npm run db:deploy
npm run db:generate
```

The migration changes openingBalance to Decimal(18,2), adds balance at the same precision, and initializes legacy balances from openingBalance. It refuses existing transactions (which need a reviewed historical balance backfill), CARD/non-INR accounts, or values that overflow the narrower precision rather than silently changing history. It adds an INR database check and preserves restrictive transaction foreign keys. The Prisma AccountType enum retains CARD for future work, but the API rejects it.

## Create

`POST /api/accounts`

```json
{"name":"Main Bank","type":"BANK","openingBalance":"2500.50"}
```

Name is trimmed, required, and limited to 100 characters. Type is CASH, BANK, or WALLET. openingBalance defaults to "0.00". Amounts must be decimal strings with at most 16 integer digits and two fractional digits. Numeric JSON values, exponent notation, commas, surrounding spaces, and excess precision are rejected. Negative opening balances are allowed for manual reconciliation. Currency is always INR; clients cannot supply it or balance/userId.

HTTP 201 (illustrative IDs/dates):

```json
{
  "success": true,
  "message": "Account created.",
  "data": {
    "account": {
      "id": "5fbb6773-4918-436c-9131-b83872ac99f6",
      "userId": "58d8dbdb-ae93-4e23-a2cc-a00a520499b7",
      "name": "Main Bank",
      "type": "BANK",
      "currency": "INR",
      "openingBalance": "2500.50",
      "balance": "2500.50",
      "isArchived": false,
      "createdAt": "2026-10-06T16:00:00.000Z",
      "updatedAt": "2026-10-06T16:00:00.000Z"
    }
  }
}
```

## Read and update

- `GET /api/accounts`: HTTP 200, `data: { "accounts": [...] }`, sorted by name then ID; empty arrays are valid. Only the authenticated user's accounts are returned, including existing archived records.
- `GET /api/accounts/:id`: HTTP 200, `data: { "account": { ... } }`.
- `PATCH /api/accounts/:id` with `{"name":"Daily Spending"}`: HTTP 200 with the renamed account. Only name is accepted; balances, type, currency, userId, and archive state cannot be patched. Empty updates are rejected.

Both monetary values always serialize as fixed-two-decimal strings. No conversion through JavaScript Number occurs. [Transaction APIs](transactions.md) now update balance atomically alongside transaction creation, update, and deletion.

## Delete

`DELETE /api/accounts/:id`

HTTP 200 for an unreferenced account:

```json
{"success":true,"message":"Account deleted.","data":null}
```

With linked transactions, HTTP 409:

```json
{"success":false,"message":"Accounts with linked transactions cannot be deleted.","data":null}
```

The existing ON DELETE RESTRICT foreign key enforces this rule atomically, including concurrent transaction inserts. No cascade deletion or transaction API is added.

All reads/mutations are scoped to the authenticated user, with the composite id_userId key for individual records. Missing IDs and another user's account both return 404 `Account not found.` Malformed UUIDs/bodies return 400; missing/invalid authentication returns 401.

Tests in tests/accounts.test.cjs exercise real routing/authentication/validation with mocked Prisma persistence, including precision boundaries, ownership, immutable balances, and foreign-key error mapping.
