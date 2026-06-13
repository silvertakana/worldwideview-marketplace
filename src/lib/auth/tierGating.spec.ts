import { describe, it, expect, vi } from "vitest";
import {
    isSubscriptionActive,
    isGracePeriodActive,
    getEffectiveTier,
    getScope,
    requiresPaidTier,
} from "./tierGating";

describe("isSubscriptionActive", () => {
    it("free user is always active", () => {
        expect(isSubscriptionActive({ tier: "free", stripeCurrentPeriodEnd: null })).toBe(true);
    });

    it("pro user with future currentPeriodEnd is active", () => {
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        expect(isSubscriptionActive({ tier: "pro", stripeCurrentPeriodEnd: future })).toBe(true);
    });

    it("pro user with past currentPeriodEnd is not active", () => {
        const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
        expect(isSubscriptionActive({ tier: "pro", stripeCurrentPeriodEnd: past })).toBe(false);
    });

    it("pro user with null currentPeriodEnd is active", () => {
        expect(isSubscriptionActive({ tier: "pro", stripeCurrentPeriodEnd: null })).toBe(true);
    });
});

describe("isGracePeriodActive", () => {
    it("no grace period when stripeCurrentPeriodEnd is null", () => {
        expect(isGracePeriodActive({ tier: "pro", stripeCurrentPeriodEnd: null })).toBe(false);
    });

    it("grace period active within 3 days of expiry", () => {
        const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
        expect(isGracePeriodActive({ tier: "pro", stripeCurrentPeriodEnd: oneDayAgo })).toBe(true);
    });

    it("grace period not active after 4 days past expiry", () => {
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        expect(isGracePeriodActive({ tier: "pro", stripeCurrentPeriodEnd: fourDaysAgo })).toBe(false);
    });
});

describe("getEffectiveTier", () => {
    it("free user gets free tier", () => {
        expect(getEffectiveTier({ tier: "free", stripeCurrentPeriodEnd: null })).toBe("free");
    });

    it("active pro user gets pro tier", () => {
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        expect(getEffectiveTier({ tier: "pro", stripeCurrentPeriodEnd: future })).toBe("pro");
    });

    it("pro in grace period gets pro tier", () => {
        const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
        expect(getEffectiveTier({ tier: "pro", stripeCurrentPeriodEnd: oneDayAgo })).toBe("pro");
    });

    it("pro past grace period gets free tier", () => {
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        expect(getEffectiveTier({ tier: "pro", stripeCurrentPeriodEnd: fourDaysAgo })).toBe("free");
    });
});

describe("getScope", () => {
    it("free user gets plugins:read", () => {
        expect(getScope({ tier: "free", stripeCurrentPeriodEnd: null })).toBe("plugins:read");
    });

    it("pro user gets plugins:read plugins:write", () => {
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        expect(getScope({ tier: "pro", stripeCurrentPeriodEnd: future })).toBe("plugins:read plugins:write");
    });
});

describe("requiresPaidTier", () => {
    it("free user is not allowed in paid tiers", () => {
        const check = requiresPaidTier(["pro"]);
        const result = check({ tier: "free", stripeCurrentPeriodEnd: null });
        expect(result.allowed).toBe(false);
    });

    it("pro user is allowed in paid tiers", () => {
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const check = requiresPaidTier(["pro"]);
        const result = check({ tier: "pro", stripeCurrentPeriodEnd: future });
        expect(result.allowed).toBe(true);
    });
});
