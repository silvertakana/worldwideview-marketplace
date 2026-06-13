import { describe, it, expect } from "vitest";
import { requirePaidTier } from "./checkTier";

describe("requirePaidTier", () => {
    it("returns 401 for null user", () => {
        const res = requirePaidTier(null);
        expect(res).not.toBeNull();
        expect(res!.status).toBe(401);
    });

    it("returns 403 for free user", () => {
        const res = requirePaidTier({ tier: "free", stripeCurrentPeriodEnd: null });
        expect(res).not.toBeNull();
        expect(res!.status).toBe(403);
    });

    it("returns null for active pro user", () => {
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const res = requirePaidTier({ tier: "pro", stripeCurrentPeriodEnd: future });
        expect(res).toBeNull();
    });

    it("allows demo tier", () => {
        const res = requirePaidTier({ tier: "demo", stripeCurrentPeriodEnd: null });
        expect(res).toBeNull();
    });
});
