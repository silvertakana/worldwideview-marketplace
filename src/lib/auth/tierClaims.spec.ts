import { describe, it, expect } from "vitest";
import { buildTierClaims, type SubscriptionStatus } from "./tierClaims";

describe("buildTierClaims", () => {
    it("free user — status free, tier free", () => {
        const claims = buildTierClaims({ tier: "free", stripeCurrentPeriodEnd: null });
        expect(claims).toEqual({ tier: "free", subscriptionStatus: "free" });
    });

    it("active pro — status active, tier pro", () => {
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const claims = buildTierClaims({ tier: "pro", stripeCurrentPeriodEnd: future });
        expect(claims).toEqual({ tier: "pro", subscriptionStatus: "active" });
    });

    it("pro in grace — status grace, tier pro", () => {
        const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
        const claims = buildTierClaims({ tier: "pro", stripeCurrentPeriodEnd: oneDayAgo });
        expect(claims).toEqual({ tier: "pro", subscriptionStatus: "grace" });
    });

    it("pro expired — status expired, tier free", () => {
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        const claims = buildTierClaims({ tier: "pro", stripeCurrentPeriodEnd: fourDaysAgo });
        expect(claims).toEqual({ tier: "free", subscriptionStatus: "expired" });
    });

    it("pro with null period — status active, tier pro", () => {
        const claims = buildTierClaims({ tier: "pro", stripeCurrentPeriodEnd: null });
        expect(claims).toEqual({ tier: "pro", subscriptionStatus: "active" });
    });
});
