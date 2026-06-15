import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTier } from "@/lib/auth/tierGating";

export async function POST(req: Request) {
    const secret = req.headers.get("x-internal-secret");
    if (secret !== process.env.MARKETPLACE_INTERNAL_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const marketplaceUser = await prisma.user.findFirst({
        where: { supabaseUserId: userId },
    });

    if (!marketplaceUser) {
        return NextResponse.json({
            tier: "free", effectiveTier: "free",
            hasSubscription: false,
            stripeCurrentPeriodEnd: null,
        });
    }

    return NextResponse.json({
        tier: marketplaceUser.tier,
        effectiveTier: getEffectiveTier(marketplaceUser),
        hasSubscription: !!marketplaceUser.stripeCustomerId,
        stripeCurrentPeriodEnd: marketplaceUser.stripeCurrentPeriodEnd,
    });
}
