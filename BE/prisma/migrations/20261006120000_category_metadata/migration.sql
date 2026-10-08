ALTER TABLE "Category" ADD COLUMN "icon" VARCHAR(50), ADD COLUMN "color" VARCHAR(7);

-- Preserve display casing while preventing duplicates, including racing requests.
-- Resolve any legacy duplicates before applying; never silently delete user data.
CREATE UNIQUE INDEX "Category_userId_type_normalized_name_key"
ON "Category" ("userId", "type", lower(btrim("name")));
