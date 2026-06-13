import { stripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const marketplaceUser = await prisma.user.findUnique({
            where: { supabaseUserId: user.id },
        });

        if (!marketplaceUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!marketplaceUser.stripeCustomerId) {
            return NextResponse.json(
                { error: "No active subscription. Subscribe first." },
                { status: 400 }
            );
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: marketplaceUser.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error("Portal session creation failed:", error);
        return NextResponse.json(
            { error: "Failed to create portal session" },
            { status: 500 }
        );
    }
}
