# Category API

All routes require `Authorization: Bearer <accessToken>`. No new packages are needed. The main router mounts `categoryRouter` at `/api/categories`.

## Files

`src/modules/categories/` contains `category.routes.ts`, `category.controller.ts`, `category.service.ts`, `category.validation.ts`, and `category.types.ts`. Validation uses Joi and the generated Prisma CategoryType enum. Controllers use the existing asyncHandler and response helpers; services use Prisma and AppError.

The schema adds nullable icon (50 characters) and color (7 characters). Apply the supplied migration and generate the client from BE:

```sh
npm run db:deploy
npm run db:generate
```

The migration adds an expression index on userId, type, and lower(btrim(name)). This prevents concurrent case-insensitive duplicates while preserving display casing. Resolve any existing conflicting category names before applying the index. It does not silently merge or delete data. Keep this index in migration history; Prisma schema syntax does not represent expression indexes.

## Create

`POST /api/categories`

```json
{"name":"Food","type":"EXPENSE","icon":"utensils","color":"#22C55E"}
```

Name is required, trimmed, and limited to 100 characters. Type must be exactly INCOME or EXPENSE. Icon and color are optional or null. Icon is a display identifier, not uploaded content or executable markup. Color must be a six-digit hex value prefixed with # and is normalized to uppercase. Unknown fields, including userId and isArchived, are rejected.

HTTP 201 (illustrative ID and dates):

```json
{
  "success": true,
  "message": "Category created.",
  "data": {
    "category": {
      "id": "5fbb6773-4918-436c-9131-b83872ac99f6",
      "userId": "58d8dbdb-ae93-4e23-a2cc-a00a520499b7",
      "name": "Food",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#22C55E",
      "isArchived": false,
      "createdAt": "2026-10-06T12:00:00.000Z",
      "updatedAt": "2026-10-06T12:00:00.000Z"
    }
  }
}
```

## Read

- `GET /api/categories`: all of the authenticated user's categories, sorted by name then ID. Returns HTTP 200 with `data: { "categories": [...] }`, including an empty array when none exist. Existing archived rows are included; this API does not add an archive workflow.
- `GET /api/categories?type=INCOME`: same response, filtered by type. Only INCOME or EXPENSE is accepted, and repeated or unknown query parameters are rejected.
- `GET /api/categories/:id`: HTTP 200 with `data: { "category": { ... } }` and message `Category retrieved.`.

## Update

`PATCH /api/categories/:id`

```json
{"name":"Dining","color":"#F97316","icon":null}
```

Any subset of name, type, icon, and color is allowed, with at least one field required. Omitted fields are preserved; null clears icon/color only. Returns HTTP 200 with the updated category and message `Category updated.`. A conflicting name/type returns 409.

## Delete

`DELETE /api/categories/:id` returns HTTP 200:

```json
{"success":true,"message":"Category deleted.","data":null}
```

Deletion is physical for unreferenced categories. No Transaction APIs or transaction counting/reassignment logic is implemented. Existing database foreign keys already restrict deleting categories referenced by transactions or budgets; that database conflict is translated to HTTP 409:

```json
{"success":false,"message":"This category is in use and cannot be deleted.","data":null}
```

When Transaction APIs are added, prefer archiving used categories with the existing isArchived field so historical records remain intact. Alternatively, reassign dependent records explicitly in a database transaction before deletion. Do not cascade-delete financial history. At that stage, also prevent changing the type of a category used by transactions/budgets unless their invariants are preserved; that business logic is not introduced here.

## Ownership and errors

The authenticated user ID comes exclusively from req.authUser, never the body or query. List queries include userId. Single reads, updates, and deletes use the composite id_userId key in the database operation itself. This avoids a separate ownership-check/write race. Both a missing ID and another user's ID return `404 Category not found.` without revealing ownership.

Malformed UUIDs and invalid bodies/query values return 400 with helpful validation messages. Missing/invalid access tokens return 401. Duplicate names within the same user/type return 409; different users or different types may reuse a name.

`tests/categories.test.cjs` exercises the HTTP routes with real JWT verification and Joi validation and mocked Prisma persistence. It checks ownership, CRUD, duplicate/error mapping, and validation without modifying PostgreSQL. Database index enforcement comes from the supplied migration.
