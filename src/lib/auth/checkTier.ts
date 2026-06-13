import { NextResponse } from "next/server";
import { getEffectiveTier } from "./tierGating";

interface TierUser {
    tier: string;
    stripeCurrentPeriodEnd: Date | null;
}

export function requirePaidTier(
    user: TierUser | null,
    allowedTiers: string[] = ["pro", "enterprise", "demo"]
): NextResponse | null {
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveTier = getEffectiveTier(user);

    if (!allowedTiers.includes(effectiveTier)) {
        return NextResponse.json(
            {
                error: "Paid subscription required",
                tier: effectiveTier,
            },
            { status: 403 }
        );
    }

    return null;
}
