-- AlterTable: add origin to MarketplaceApiKey (nullable so existing rows are safe)
ALTER TABLE "MarketplaceApiKey" ADD COLUMN "origin" TEXT;

-- CreateIndex: origin filter used by the OAuth redirect-URI policy
CREATE INDEX "MarketplaceApiKey_origin_idx" ON "MarketplaceApiKey"("origin");
