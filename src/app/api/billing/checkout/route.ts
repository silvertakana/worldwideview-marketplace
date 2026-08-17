import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkoutLimiter } from "@/lib/rateLimiters";

export async function POST(req: Request) {
    let body: { priceId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user limiter (10/min) — caps Stripe session-creation cost surface.
    const limiter = checkoutLimiter.check(`user:${user.id}`);
    if (limiter) return limiter;

    const marketplaceUser = await prisma.user.findFirst({
        where: { supabaseUserId: user.id },
    });
    if (!marketplaceUser) {
        return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!proPriceId) {
        return NextResponse.json({ error: "Pro plan not configured" }, { status: 500 });
    }

    const priceId = body.priceId || proPriceId;

    let customerId: string;
    const customers = await stripe.customers.search({
        query: `metadata['userId']:'${marketplaceUser.id}'`,
        limit: 1,
    });
    if (customers.data.length > 0) {
        customerId = customers.data[0].id;
    } else {
        const customer = await stripe.customers.create({
            email: marketplaceUser.email,
            metadata: { userId: marketplaceUser.id },
        });
        customerId = customer.id;
    }

    const origin = req.headers.get("origin") || "";

    const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
            trial_period_days: 7,
            metadata: { userId: marketplaceUser.id },
        },
        client_reference_id: marketplaceUser.id,
        metadata: { userId: marketplaceUser.id },
        success_url: origin
            ? `${origin}/billing?checkout=success`
            : "/billing?checkout=success",
        cancel_url: origin
            ? `${origin}/billing`
            : "/billing",
    });

    return NextResponse.json({ url: checkoutSession.url });
}
