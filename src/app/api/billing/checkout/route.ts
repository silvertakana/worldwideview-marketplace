import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PRICE_IDS: Record<string, string> = {
    pro_monthly: "price_placeholder_monthly",
    pro_yearly: "price_placeholder_yearly",
};

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { priceId } = await req.json();

        if (!priceId || !PRICE_IDS[priceId]) {
            return NextResponse.json(
                { error: "Invalid price ID. Use pro_monthly or pro_yearly." },
                { status: 400 }
            );
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: PRICE_IDS[priceId],
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/account?canceled=true`,
            client_reference_id: user.id,
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error("Checkout session creation failed:", error);
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
