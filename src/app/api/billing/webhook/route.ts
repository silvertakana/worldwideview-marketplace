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
    } catch (err: any) {
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as { id: string };
                const userId = (session as any).client_reference_id || (session as any).metadata?.userId;
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
    } catch (err: any) {
        console.error(`[webhook] Error handling ${(event as any)?.type ?? "unknown"}:`, err);
    }

    return new NextResponse(null, { status: 200 });
}
