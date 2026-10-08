-- Nullable to preserve existing profiles without inventing shared credentials.
ALTER TABLE "User" ADD COLUMN "passwordHash" VARCHAR(60);

-- Enforce case-insensitive uniqueness, including concurrent registrations.
-- If legacy case variants exist, resolve them explicitly before applying this migration.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));
