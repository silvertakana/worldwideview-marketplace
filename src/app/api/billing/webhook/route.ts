import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            sig!,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        const { handleStripeEvent } = await import(
            "@/lib/billing/webhookHandler"
        );
        await handleStripeEvent(event);
    } catch (err: any) {
        console.error("Webhook processing failed:", err.message);
        return new NextResponse("Processing Error", { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}
