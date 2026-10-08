BEGIN;
ALTER TABLE "Budget" ADD COLUMN "month" INTEGER, ADD COLUMN "year" INTEGER;
UPDATE "Budget" SET "month" = EXTRACT(MONTH FROM "startsAt" AT TIME ZONE 'Asia/Kolkata'),
  "year" = EXTRACT(YEAR FROM "startsAt" AT TIME ZONE 'Asia/Kolkata');
-- Preserve valid monthly legacy budgets; fail rather than silently reshape periods.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Budget" b JOIN "Category" c ON c."id" = b."categoryId"
    WHERE c."type" <> 'EXPENSE') THEN
    RAISE EXCEPTION 'Resolve non-expense legacy budgets before applying monthly budgets';
  END IF;
END $$;
ALTER TABLE "Budget" ALTER COLUMN "month" SET NOT NULL, ALTER COLUMN "year" SET NOT NULL,
  ALTER COLUMN "amount" TYPE DECIMAL(18,2);
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_month_range_check" CHECK ("month" BETWEEN 1 AND 12),
  ADD CONSTRAINT "Budget_year_range_check" CHECK ("year" BETWEEN 1970 AND 9999),
  ADD CONSTRAINT "Budget_amount_positive_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "Budget_currency_inr_check" CHECK ("currency" = 'INR'),
  ADD CONSTRAINT "Budget_month_boundaries_check" CHECK (
    "startsAt" = make_timestamptz("year", "month", 1, 0, 0, 0, 'Asia/Kolkata') AND
    "endsAt" = ((make_date("year", "month", 1) + INTERVAL '1 month') AT TIME ZONE 'Asia/Kolkata')
  );
DROP INDEX "Budget_categoryId_userId_currency_startsAt_endsAt_key";
DROP INDEX "Budget_userId_startsAt_endsAt_idx";
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_year_key" ON "Budget"("userId", "categoryId", "month", "year");
CREATE INDEX "Budget_userId_year_month_idx" ON "Budget"("userId", "year", "month");
COMMIT;
