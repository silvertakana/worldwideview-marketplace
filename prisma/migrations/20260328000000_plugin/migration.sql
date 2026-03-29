-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "npmPackage" TEXT NOT NULL,
    "name" TEXT,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "trust" TEXT NOT NULL DEFAULT 'pending',
    "capabilities" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "changelog" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_npmPackage_key" ON "Plugin"("npmPackage");

