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

    // Marketplace no longer stores tier/stripe info locally.
    // The canonical source is worldwideview Account API via Phase 58 proxy.
    // Phase 60 will add the proxy read. For now, default to "free".
    return NextResponse.json({
        tier: "free",
        effectiveTier: "free",
        hasSubscription: false,
        stripeCurrentPeriodEnd: null,
    });
}
