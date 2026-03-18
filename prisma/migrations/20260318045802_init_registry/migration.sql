-- CreateTable
CREATE TABLE "VerifiedPlugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
