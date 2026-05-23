-- AlterTable: add supabaseUserId to User (nullable so existing rows are safe)
ALTER TABLE "User" ADD COLUMN "supabaseUserId" TEXT;

-- CreateIndex: unique constraint on supabaseUserId
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateTable: OAuth authorization codes (PKCE flow)
CREATE TABLE "oauth_authorization_codes" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_authorization_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex: expiry-based cleanup index
CREATE INDEX "oauth_authorization_codes_expiresAt_idx" ON "oauth_authorization_codes"("expiresAt");
