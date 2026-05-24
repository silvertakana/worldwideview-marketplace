-- CreateTable: DB-resident signing keys for Ed25519 JWT issuance with zero-downtime rotation
CREATE TABLE "SigningKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kid" TEXT NOT NULL,
    "privateJwk" TEXT NOT NULL,
    "publicJwk" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" DATETIME,
    "revokedAt" DATETIME
);

-- CreateIndex: unique constraint on key ID
CREATE UNIQUE INDEX "SigningKey_kid_key" ON "SigningKey"("kid");

-- CreateIndex: status filter used by JWKS and exchange endpoints
CREATE INDEX "SigningKey_status_idx" ON "SigningKey"("status");
