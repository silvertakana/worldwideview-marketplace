import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const secret = req.headers.get("x-internal-secret");
    if (secret !== process.env.MARKETPLACE_INTERNAL_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const authHost = process.env.NEXT_PUBLIC_AUTH_HOST_URL;
    const apiKey = process.env.PROVISIONING_API_KEY;

    if (!authHost || !apiKey) {
        // Fallback: no upstream configured
        return NextResponse.json({
            tier: "free",
            effectiveTier: "free",
            hasSubscription: false,
            stripeCustomerId: null,
            stripeCurrentPeriodEnd: null,
        });
    }

    try {
        const response = await fetch(
            `${authHost}/api/account?userId=${userId}`,
            {
                headers: {
                    "x-api-key": apiKey,
                    "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(5000),
            },
        );

        if (!response.ok) {
            return NextResponse.json({
                tier: "free",
                effectiveTier: "free",
                hasSubscription: false,
                stripeCustomerId: null,
                stripeCurrentPeriodEnd: null,
            });
        }

        const data = await response.json();
        const account = data.account;
        const plan = account?.plan ?? "free";
        const effectiveTier = plan;
        const hasSubscription = !!(account?.stripeSubscriptionId);
        const isTrialing = account?.isTrialing ?? false;

        return NextResponse.json({
            tier: plan,
            effectiveTier: effectiveTier,
            hasSubscription: hasSubscription || isTrialing,
            stripeCustomerId: account?.stripeCustomerId ?? null,
            stripeCurrentPeriodEnd: account?.trialEndsAt ?? null,
            trialDaysRemaining: account?.trialDaysRemaining ?? null,
            plan: plan,
        });
    } catch (error) {
        console.error("Internal subscription fetch failed (upstream):", error);
        return NextResponse.json({
            tier: "free",
            effectiveTier: "free",
            hasSubscription: false,
            stripeCustomerId: null,
            stripeCurrentPeriodEnd: null,
        });
    }
}
