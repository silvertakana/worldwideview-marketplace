import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        const response = await fetch(
            `${authHost}/api/account?userId=${user.id}`,
            {
                headers: {
                    "x-api-key": apiKey,
                    "Content-Type": "application/json",
                },
                // Timeout after 5 seconds to avoid hanging
                signal: AbortSignal.timeout(5000),
            },
        );

        if (!response.ok) {
            // Upstream error — fallback to free
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
            stripeCurrentPeriodEnd: account?.trialEndsAt ?? null, // approximate end date from trial
            trialDaysRemaining: account?.trialDaysRemaining ?? null,
            plan: plan, // alias for backward compat
        });
    } catch (error) {
        // Network error or timeout — fallback to free
        console.error("Subscription fetch failed (upstream):", error);
        return NextResponse.json({
            tier: "free",
            effectiveTier: "free",
            hasSubscription: false,
            stripeCustomerId: null,
            stripeCurrentPeriodEnd: null,
        });
    }
}
