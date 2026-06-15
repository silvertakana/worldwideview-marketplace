import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTier } from "@/lib/auth/tierGating";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const marketplaceUser = await prisma.user.findFirst({
            where: { supabaseUserId: user.id },
        });

        if (!marketplaceUser) {
            return NextResponse.json({
                tier: "free",
                effectiveTier: "free",
                stripeCustomerId: null,
                stripeCurrentPeriodEnd: null,
            });
        }

        return NextResponse.json({
            tier: marketplaceUser.tier,
            effectiveTier: getEffectiveTier(marketplaceUser),
            hasSubscription: !!marketplaceUser.stripeCustomerId,
            stripeCustomerId: marketplaceUser.stripeCustomerId,
            stripeCurrentPeriodEnd: marketplaceUser.stripeCurrentPeriodEnd,
        });
    } catch (error) {
        console.error("Subscription fetch failed:", error);
        return NextResponse.json(
            { error: "Failed to fetch subscription" },
            { status: 500 }
        );
    }
}
