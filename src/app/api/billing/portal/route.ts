import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { portalLimiter } from "@/lib/rateLimiters";

export async function POST(req: Request) {
    let body: Record<string, unknown>;
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

    // Per-user limiter (10/min) — caps Stripe portal-session creation cost surface.
    const limiter = portalLimiter.check(`user:${user.id}`);
    if (limiter) return limiter;

    const marketplaceUser = await prisma.user.findFirst({
        where: { supabaseUserId: user.id },
    });
    if (!marketplaceUser?.email) {
        return NextResponse.json(
            { error: "No Stripe customer found for this account" },
            { status: 404 },
        );
    }

    // Marketplace no longer stores stripeCustomerId locally.
    // Look up the Stripe customer by email instead.
    const customers = await stripe.customers.list({
        email: marketplaceUser.email,
        limit: 1,
    });
    const stripeCustomer = customers.data[0];
    if (!stripeCustomer) {
        return NextResponse.json(
            { error: "No Stripe customer found for this account" },
            { status: 404 },
        );
    }

    const origin = req.headers.get("origin") || "";

    const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomer.id,
        return_url: origin
            ? `${origin}/billing`
            : "/billing",
    });

    return NextResponse.json({ url: portalSession.url });
}
