BEGIN;
ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE DECIMAL(18,2);
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_positive_amount_check" CHECK ("amount" > 0);
DROP INDEX "Transaction_userId_occurredAt_idx";
CREATE INDEX "Transaction_userId_occurredAt_id_idx" ON "Transaction"("userId", "occurredAt", "id");
COMMIT;
