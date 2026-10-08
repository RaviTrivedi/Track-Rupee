# Monthly category budgets

All endpoints require `Authorization: Bearer <accessToken>`. Budgets are INR-only limits for one owned EXPENSE category and one Asia/Kolkata calendar month. They are informational: exceeding a budget never blocks an expense.

## Setup and files

From BE:

```sh
npm run db:deploy
npm run db:generate
```

The included migration adds month/year, changes amount to Decimal(18,2), and enforces uniqueness on (userId, categoryId, month, year). CHECK constraints enforce positive amounts, INR, supported dates, and exact Kolkata month boundaries. Existing monthly budgets are preserved; incompatible legacy periods/currencies/types or duplicates stop migration rather than being silently rewritten. startsAt/endsAt remain as derived UTC query boundaries, not caller-controlled fields. The category foreign key remains ON DELETE RESTRICT.

`src/modules/budgets/` contains budget.routes.ts, budget.controller.ts, budget.service.ts, budget.validation.ts, budget.types.ts, and budget.progress.ts. The main router mounts it at /api/budgets. Category type changes are also blocked when a category has budgets, using the existing serializable transaction helper.

## Create

`POST /api/budgets`

```json
{
  "categoryId": "af94e544-2047-4b37-ab33-9a91e4fdafbe",
  "amount": "5000.00",
  "month": 10,
  "year": 2026
}
```

Amount must be a positive decimal string with at most 16 integer digits and two decimal places. Month is 1–12; supported years are 1970–9999. Unknown fields are rejected. Category must be owned by the caller and have type EXPENSE. A duplicate category/month/year returns 409, including concurrent requests.

HTTP 201 (illustrative values; spent reflects existing transactions):

```json
{
  "success": true,
  "message": "Budget created.",
  "data": {
    "budget": {
      "id": "bf9de127-fccb-4aaa-8c99-355b7a123539",
      "userId": "58d8dbdb-ae93-4e23-a2cc-a00a520499b7",
      "categoryId": "af94e544-2047-4b37-ab33-9a91e4fdafbe",
      "amount": "5000.00",
      "currency": "INR",
      "month": 10,
      "year": 2026,
      "startsAt": "2026-09-30T18:30:00.000Z",
      "endsAt": "2026-10-31T18:30:00.000Z",
      "createdAt": "2026-10-06T12:00:00.000Z",
      "updatedAt": "2026-10-06T12:00:00.000Z",
      "limit": "5000.00",
      "spent": "6250.00",
      "remaining": "-1250.00",
      "percentageUsed": "125.00",
      "isOverBudget": true
    }
  }
}
```

amount and limit represent the same budget limit. Monetary values and percentageUsed serialize as decimal strings with two fractional digits. isOverBudget is true only when spent exceeds limit, not when they are equal. Percentage rounding never determines the boolean.

## List and get

`GET /api/budgets?page=1&limit=20&month=10&year=2026`

Month/year filters are optional and independent. Default pagination is page=1, limit=20; limit is capped at 100 and page at 1,000,000. Results are sorted by year descending, month descending, then ID descending.

HTTP 200:

```json
{
  "success": true,
  "message": "Budgets retrieved.",
  "data": {
    "budgets": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0, "hasNextPage": false }
  }
}
```

Nonempty budgets contain the same progress fields as creation. `GET /api/budgets/:id` returns `data.budget` with message `Budget retrieved.`.

## Update and delete

`PATCH /api/budgets/:id`

```json
{"amount":"6000.00"}
```

Only amount can change. Category, month, year, currency, and computed progress are immutable through PATCH. Returns HTTP 200 with updated data.budget and message `Budget updated.`.

`DELETE /api/budgets/:id` returns HTTP 200:

```json
{"success":true,"message":"Budget deleted.","data":null}
```

All record operations include the authenticated user's ID. Missing or another user's budget/category returns 404. INCOME categories and invalid requests return 400. Duplicate budgets return 409. Deleting a category referenced by budgets returns 409; no cascade deletes are used.

## Progress and consistency

October 2026 in Asia/Kolkata is [2026-09-30T18:30:00Z, 2026-10-31T18:30:00Z). The start is inclusive; the next-month start is exclusive. Kolkata is UTC+05:30 throughout the supported year range, so the helper constructs UTC instants independently of the server timezone and handles leap years/year rollover.

One set-based SQL aggregate sums the authenticated user's EXPENSE transactions by budget/category and its month boundaries across all their accounts. It does not issue one aggregation per budget. Lists use a constant number of queries (count, page, aggregate) and a repeatable-read snapshot so limits, pagination, and spending agree within a response. Empty pages skip aggregation.

remaining = limit - spent; percentageUsed = spent / limit × 100. Decimal arithmetic preserves cents, negative remaining, and percentages over 100. There is no stored spent field. Editing/deleting transactions changes the next progress response. Budgets never mutate transactions or account balances, and transaction creation does not enforce limits.

## Focused tests

Run `npm test`. tests/budgets.test.cjs covers month boundaries (including leap years/December), validation, precise/unclamped progress, and one aggregate call per page. tests/budgets.integration.test.cjs covers actual PostgreSQL ownership, duplicate/concurrent budgets, expense-only categories, all-account spending, boundary inclusion/exclusion, pagination, category protection, and unchanged finances on budget writes.

Database tests are opt-in with TEST_DATABASE_URL pointing at a migrated disposable database. They create unique fixtures and remove only those fixture records in finally. Without that variable they are explicitly skipped. No jobs, rollover, notifications, or overall budgets are implemented.
