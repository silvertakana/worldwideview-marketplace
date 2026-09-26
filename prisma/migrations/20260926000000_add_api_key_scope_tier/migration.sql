-- Scope and tier live on the key that presents itself, not on the user record:
-- the demo identity is marked by its credential. Both columns are nullable, so
-- every existing key keeps minting exactly the ticket it mints today.
ALTER TABLE "MarketplaceApiKey" ADD COLUMN "scope" TEXT;
ALTER TABLE "MarketplaceApiKey" ADD COLUMN "tier" TEXT;
