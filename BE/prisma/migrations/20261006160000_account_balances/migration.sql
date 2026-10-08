BEGIN;
-- Fail rather than silently discard legacy transactions or convert currencies.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Account" WHERE "currency" <> 'INR' OR "type" = 'CARD') THEN
    RAISE EXCEPTION 'Resolve legacy non-INR or CARD accounts before enabling manual INR accounts';
  END IF;
  IF EXISTS (SELECT 1 FROM "Transaction") THEN
    RAISE EXCEPTION 'Existing transactions require a reviewed balance backfill before this migration';
  END IF;
END $$;
ALTER TABLE "Account" ALTER COLUMN "openingBalance" TYPE DECIMAL(18,2);
ALTER TABLE "Account" ADD COLUMN "balance" DECIMAL(18,2);
UPDATE "Account" SET "balance" = "openingBalance";
ALTER TABLE "Account" ALTER COLUMN "balance" SET NOT NULL,
  ALTER COLUMN "balance" SET DEFAULT 0;
ALTER TABLE "Account" ADD CONSTRAINT "Account_currency_inr_check" CHECK ("currency" = 'INR');
COMMIT;
