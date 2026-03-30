-- CreateTable
CREATE TABLE "NpmCache" (
    "npmPackage" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "repository" TEXT,
    "readme" TEXT,
    "changelog" TEXT,
    "updatedAt" TEXT NOT NULL,
    "crawledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable: Drop the legacy "name" column from Plugin
-- The Plugin table had a "name" column in the original migration
-- but the current schema no longer includes it.
-- SQLite doesn't support DROP COLUMN directly in older versions,
-- so we recreate the table.

CREATE TABLE "Plugin_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "npmPackage" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "trust" TEXT NOT NULL DEFAULT 'pending',
    "capabilities" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "changelog" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "Plugin_new" ("id", "npmPackage", "icon", "category", "format", "trust", "capabilities", "longDescription", "changelog", "addedAt")
    SELECT "id", "npmPackage", "icon", "category", "format", "trust", "capabilities", "longDescription", "changelog", "addedAt" FROM "Plugin";

DROP TABLE "Plugin";
ALTER TABLE "Plugin_new" RENAME TO "Plugin";

CREATE UNIQUE INDEX "Plugin_npmPackage_key" ON "Plugin"("npmPackage");
