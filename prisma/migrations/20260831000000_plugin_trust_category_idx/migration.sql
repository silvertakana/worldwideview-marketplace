-- CreateIndex: registry listing filters trust (every query) + category (browse tab)
CREATE INDEX "Plugin_trust_category_idx" ON "Plugin"("trust", "category");
