# Transaction API

All routes require `Authorization: Bearer <accessToken>`. Transactions belong to the authenticated user and operate only on INR accounts. No budget, transfer, or currency-conversion APIs are included.

## Migration

From BE:

```sh
npm run db:deploy
npm run db:generate
```

The included migration changes Transaction.amount to Decimal(18,2), adds a positive-amount CHECK constraint, and extends the user/date index with ID. Invalid legacy amounts cause migration failure rather than silent correction. The existing storage names occurredAt and description remain; the API exposes them as date and note. Existing balances are not recalculated by this migration.

Implementation lives in src/modules/transactions (routes, controller, service, validation, types). src/utils/serializable.ts provides bounded conflict retries. The existing category service now refuses type changes on categories with linked transactions to preserve type consistency, including concurrent writes.

## Create

`POST /api/transactions`

```json
{
  "type": "EXPENSE",
  "amount": "250.50",
  "accountId": "5fbb6773-4918-436c-9131-b83872ac99f6",
  "categoryId": "af94e544-2047-4b37-ab33-9a91e4fdafbe",
  "date": "2026-10-06T12:30:00+05:30",
  "note": "Lunch"
}
```

HTTP 201 (illustrative IDs/timestamps):

```json
{
  "success": true,
  "message": "Transaction created.",
  "data": {
    "transaction": {
      "id": "c70b6f6f-2351-4cfb-a748-16aaf1f2f72a",
      "userId": "58d8dbdb-ae93-4e23-a2cc-a00a520499b7",
      "accountId": "5fbb6773-4918-436c-9131-b83872ac99f6",
      "categoryId": "af94e544-2047-4b37-ab33-9a91e4fdafbe",
      "type": "EXPENSE",
      "amount": "250.50",
      "date": "2026-10-06T07:00:00.000Z",
      "note": "Lunch",
      "createdAt": "2026-10-06T07:01:00.000Z",
      "updatedAt": "2026-10-06T07:01:00.000Z"
    }
  }
}
```

Amounts must be positive decimal strings, with at most 16 integer digits and two decimal places. JSON numbers, zero, negative values, exponents, and excess precision are rejected. Output amounts always have two decimals. Notes are optional, up to 500 characters, and can be null or empty.

Dates require a real calendar date, seconds, and an explicit Z or ±HH:mm timezone. Fractional seconds may contain 1–3 digits, matching database millisecond precision. Invalid dates such as February 30 and timestamps without a timezone return 400. Dates are returned in UTC.

## List and get

`GET /api/transactions?page=1&limit=20&type=EXPENSE&from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z`

Optional filters: accountId, categoryId, type, from, to. URL-encode + in timezone offsets as %2B. from is inclusive; to is exclusive. When both are present, from must be earlier than to. Unknown/repeated filters are rejected. Pagination defaults to page=1 and limit=20; limit is 1–100 and page is 1–1,000,000.

HTTP 200:

```json
{
  "success": true,
  "message": "Transactions retrieved.",
  "data": {
    "transactions": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0,
      "hasNextPage": false
    }
  }
}
```

Nonempty entries use the same transaction shape as creation. Order is date descending, then ID descending for ties. Count and page data come from one repeatable-read snapshot. Separate page requests may shift as records are added/edited/deleted; this is offset pagination, not a persistent snapshot.

`GET /api/transactions/:id` returns HTTP 200 with `data.transaction` and message `Transaction retrieved.`.

## Update

`PATCH /api/transactions/:id`

```json
{"amount":"300.00","note":"Lunch and snacks"}
```

Any subset of the create fields is accepted; at least one is required. Omitted fields remain unchanged and note:null clears the note. Changing type requires that the final category match it. Moving to another owned account is allowed; the original account's effect is reversed and the replacement applied to the destination.

HTTP 200 returns `data.transaction` and message `Transaction updated.`. userId, currency, balance, and internal database field names cannot be supplied.

## Delete

`DELETE /api/transactions/:id`

```json
{"success":true,"message":"Transaction deleted.","data":null}
```

Returns HTTP 200 after reversing the effect and deleting the record atomically. Repeating deletion returns 404 without changing any balance.

## Ownership and balance rules

User identity comes from authentication. All record reads/mutations include userId; selected accounts/categories must also belong to that user. Missing and inaccessible records return 404. Foreign account/category listing filters also return 404. A category/type mismatch returns 400. Negative resulting balances are valid.

INCOME adds amount; EXPENSE subtracts amount. Updates calculate the old effect's inverse and the new effect using Prisma.Decimal, with no Number conversion. For the same account, one net increment avoids temporary numeric overflow. Different accounts are updated in stable ID order to reduce deadlocks.

All balance and transaction mutations occur in one serializable database transaction. A conflict or deadlock reported as Prisma P2034 retries the entire operation—including rereading the previous record—up to four total attempts with brief exponential backoff/jitter. Exhaustion returns 409 and no partial changes. Other errors are not blindly retried. Numeric overflow rolls back the complete operation. Concurrent edits/deletes cannot reverse the same committed effect twice.

There is no request idempotency key in this step. A client should not blindly retry a POST after an ambiguous network timeout: it may have committed already. Database-confirmed serialization failures are safe for internal retry because their transactions were rolled back.

## Tests

```sh
npm test
```

tests/transactions.test.cjs checks amount/date validation, pagination validation, and bounded retries. tests/transactions.integration.test.cjs is opt-in: set TEST_DATABASE_URL to a **migrated disposable PostgreSQL database**, then run npm test. It creates uniquely named users and removes only its fixtures in finally. Never point it at production.

Database tests cover foreign ownership, type mismatch, income/expense effects, account moves, negative balances, rollback after insert/overflow failures, simultaneous creates/edits/deletes, category type protection, stable ordering, and date boundaries. Without TEST_DATABASE_URL, these integration checks are explicitly skipped rather than replaced with mocks of database concurrency.

Reference: [Prisma serializable transactions and P2034 retries](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions).
