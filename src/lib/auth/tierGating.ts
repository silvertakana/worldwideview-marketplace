import { scopeFor } from "./tierScope";

const GRACE_PERIOD_DAYS = 3;

interface TierUser {
    tier: string;
    stripeCurrentPeriodEnd: Date | null;
}

export function isSubscriptionActive(user: TierUser): boolean {
    if (user.tier === "free") return true;

    if (!user.stripeCurrentPeriodEnd) return true;

    return user.stripeCurrentPeriodEnd.getTime() > Date.now();
}

export function isGracePeriodActive(user: TierUser): boolean {
    if (!user.stripeCurrentPeriodEnd) return false;

    const now = Date.now();
    const expiry = user.stripeCurrentPeriodEnd.getTime();
    const graceMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

    return expiry <= now && now <= expiry + graceMs;
}

export function getEffectiveTier(user: TierUser): string {
    if (user.tier === "free") return "free";

    if (isSubscriptionActive(user)) return user.tier;

    if (isGracePeriodActive(user)) return user.tier;

    return "free";
}

export function getScope(user: TierUser): string {
    return scopeFor(getEffectiveTier(user));
}

export function requiresPaidTier(allowedTiers: string[] = ["pro", "enterprise"]) {
    return function checkTier(user: TierUser): { allowed: boolean; tier: string } {
        const effectiveTier = getEffectiveTier(user);
        const allowed = allowedTiers.includes(effectiveTier);
        return { allowed, tier: effectiveTier };
    };
}
