import { getEffectiveTier, isSubscriptionActive, isGracePeriodActive } from "./tierGating";

interface TierUser {
    tier: string;
    stripeCurrentPeriodEnd: Date | null;
}

export type SubscriptionStatus = "active" | "grace" | "free" | "expired";

export interface TierClaims {
    tier: string;
    subscriptionStatus: SubscriptionStatus;
}

export function buildTierClaims(user: TierUser): TierClaims {
    const effectiveTier = getEffectiveTier(user);

    let subscriptionStatus: SubscriptionStatus;

    if (user.tier === "free") {
        subscriptionStatus = "free";
    } else if (isSubscriptionActive(user)) {
        subscriptionStatus = "active";
    } else if (isGracePeriodActive(user)) {
        subscriptionStatus = "grace";
    } else {
        subscriptionStatus = "expired";
    }

    return {
        tier: effectiveTier,
        subscriptionStatus,
    };
}
