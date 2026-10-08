-- Existing categories remain user-created; never rewrite their metadata.
ALTER TABLE "Category" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
