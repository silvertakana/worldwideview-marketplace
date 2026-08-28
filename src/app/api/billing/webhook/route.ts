import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
        return new NextResponse("Webhook Error: Missing stripe-signature header", { status: 400 });
    }

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!,
        );
    } catch (err) {
        return new NextResponse(`Webhook Error: ${err instanceof Error ? err.message : "Unknown signature error"}`, { status: 400 });
    }

    // Idempotency: skip events we have already fully processed (Stripe retries
    // deliveries, so the same event.id can arrive more than once).
    try {
        const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
        if (seen) {
            return new NextResponse(null, { status: 200 });
        }
    } catch (err) {
        console.error(`[webhook] Dedup lookup failed for ${event.id}:`, err);
        // Lookup failure: fall through and process. Prefers a rare duplicate
        // side effect over silently dropping a valid event.
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as {
                    id: string;
                    client_reference_id?: string;
                    metadata?: { userId?: string };
                };
                const userId = session.client_reference_id ?? session.metadata?.userId;
                console.log(`[webhook] checkout.session.completed for user ${userId ?? "unknown"}`);
                break;
            }

            case "customer.subscription.updated":
            case "customer.subscription.created": {
                const subscription = event.data.object as { id: string; status: string };
                console.log(`[webhook] subscription ${subscription.id} ${subscription.status}`);
                break;
            }

            case "customer.subscription.deleted": {
                const deletedSub = event.data.object as { id: string };
                console.log(`[webhook] subscription ${deletedSub.id} deleted`);
                break;
            }

            case "invoice.paid": {
                const invoice = event.data.object as { id: string };
                console.log(`[webhook] invoice ${invoice.id} paid`);
                break;
            }

            case "invoice.payment_failed": {
                const failedInvoice = event.data.object as { id: string };
                console.log(`[webhook] invoice ${failedInvoice.id} payment failed`);
                break;
            }
        }
    } catch (err) {
        console.error(`[webhook] Error handling ${event.type}:`, err);
        // Handling failed: do NOT record the event as processed, so a Stripe
        // retry re-runs the side effect. Still return 200 (no lost events).
        return new NextResponse(null, { status: 200 });
    }

    // Record the event as processed only AFTER handling succeeded. A crash
    // before this insert leaves the event unrecorded, letting Stripe retry.
    try {
        await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
    } catch (err) {
        if ((err as { code?: string }).code === "P2002") {
            // Concurrent delivery of the same event already recorded it.
            return new NextResponse(null, { status: 200 });
        }
        console.error(`[webhook] Failed to record event ${event.id}:`, err);
    }

    return new NextResponse(null, { status: 200 });
}
