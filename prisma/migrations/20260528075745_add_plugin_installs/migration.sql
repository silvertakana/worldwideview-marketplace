-- CreateTable
CREATE TABLE "plugin_installs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "pluginSlug" TEXT NOT NULL,
    "pluginVersion" TEXT NOT NULL,
    "instanceUrl" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "plugin_installs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plugin_installs_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "linked_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "linked_instances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "npmPackage" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "trust" TEXT NOT NULL DEFAULT 'pending',
    "capabilities" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "changelog" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installs" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Plugin" ("addedAt", "capabilities", "category", "changelog", "format", "icon", "id", "longDescription", "npmPackage", "trust") SELECT "addedAt", "capabilities", "category", "changelog", "format", "icon", "id", "longDescription", "npmPackage", "trust" FROM "Plugin";
DROP TABLE "Plugin";
ALTER TABLE "new_Plugin" RENAME TO "Plugin";
CREATE UNIQUE INDEX "Plugin_npmPackage_key" ON "Plugin"("npmPackage");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "plugin_installs_userId_installedAt_idx" ON "plugin_installs"("userId", "installedAt");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_installs_userId_pluginId_key" ON "plugin_installs"("userId", "pluginId");

-- CreateIndex
CREATE INDEX "linked_instances_userId_lastUsedAt_idx" ON "linked_instances"("userId", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "linked_instances_userId_url_key" ON "linked_instances"("userId", "url");
