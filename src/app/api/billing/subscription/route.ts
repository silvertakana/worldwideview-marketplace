import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Marketplace no longer stores tier/stripe info locally.
        // The canonical source is worldwideview Account API via Phase 58 proxy.
        // Phase 60 will add the proxy read. For now, default to "free".
        return NextResponse.json({
            tier: "free",
            effectiveTier: "free",
            hasSubscription: false,
            stripeCustomerId: null,
            stripeCurrentPeriodEnd: null,
        });
    } catch (error) {
        console.error("Subscription fetch failed:", error);
        return NextResponse.json(
            { error: "Failed to fetch subscription" },
            { status: 500 }
        );
    }
}
