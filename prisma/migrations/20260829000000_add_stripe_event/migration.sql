-- CreateTable: webhook idempotency ledger (Stripe event.id dedup)
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
