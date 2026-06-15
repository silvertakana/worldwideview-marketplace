import { stripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/prisma";
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
                const sessionData = event.data.object as { id: string };
                const session = await stripe.checkout.sessions.retrieve(
                    sessionData.id,
                    { expand: ["subscription"] },
                );

                const userId = session.client_reference_id || session.metadata?.userId;
                if (!userId) {
                    console.warn("[webhook] checkout.session.completed missing userId in client_reference_id or metadata");
                    break;
                }

                const customerId = (session.customer as string | null) ?? null;
                const sub = session.subscription as { trial_end?: number | null; current_period_end?: number } | null;

                // Use trial end if present, otherwise current period end, otherwise 7 days from now
                let periodEnd: Date;
                if (sub?.trial_end) {
                    periodEnd = new Date(sub.trial_end * 1000);
                } else if (sub?.current_period_end) {
                    periodEnd = new Date(sub.current_period_end * 1000);
                } else {
                    periodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                }

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        stripeCustomerId: customerId,
                        tier: "pro",
                        stripeCurrentPeriodEnd: periodEnd,
                    },
                });

                console.log(`[webhook] User ${userId} set to pro (customer: ${customerId}, periodEnd: ${periodEnd.toISOString()})`);
                break;
            }

            case "customer.subscription.updated":
            case "customer.subscription.created": {
                const subscription = event.data.object as {
                    id: string;
                    status: string;
                    customer?: string;
                };

                const customerId = subscription.customer ?? "unknown";

                // Handle canceled/unpaid subscriptions
                if (subscription.status === "canceled" || subscription.status === "unpaid") {
                    await prisma.user.updateMany({
                        where: { stripeCustomerId: customerId },
                        data: {
                            tier: "free",
                            stripeCurrentPeriodEnd: null,
                        },
                    });
                    console.log(`[webhook] User for customer ${customerId} reset to free (subscription ${subscription.status})`);
                } else {
                    // Active/moving forward: derive period_end from the subscription object
                    // The subscription object has current_period_end from Stripe
                    const subWithPeriod = event.data.object as { current_period_end?: number };
                    const periodEnd = subWithPeriod.current_period_end
                        ? new Date(subWithPeriod.current_period_end * 1000)
                        : undefined;

                    await prisma.user.updateMany({
                        where: { stripeCustomerId: customerId },
                        data: {
                            stripeCurrentPeriodEnd: periodEnd,
                            // Only update tier if the user is not already on a higher tier
                            tier: "pro",
                        },
                    });
                    console.log(`[webhook] User for customer ${customerId} updated (periodEnd: ${periodEnd?.toISOString() ?? "unchanged"})`);
                }
                break;
            }

            case "customer.subscription.deleted": {
                const deletedSub = event.data.object as { customer?: string };
                const customerId = deletedSub.customer ?? "unknown";

                const user = await prisma.user.findFirst({
                    where: { stripeCustomerId: customerId },
                });

                if (!user) {
                    console.warn(`[webhook] subscription.deleted: no user found for customer ${customerId}`);
                    break;
                }

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        tier: "free",
                        stripeCustomerId: null,
                        stripeCurrentPeriodEnd: null,
                    },
                });

                console.log(`[webhook] User ${user.id} reset to free (subscription deleted)`);
                break;
            }

            case "invoice.paid": {
                const invoice = event.data.object as unknown as { customer: string; period_end?: number };
                const customerId = invoice.customer;
                const periodEnd = invoice.period_end
                    ? new Date(invoice.period_end * 1000)
                    : undefined;

                if (periodEnd) {
                    await prisma.user.updateMany({
                        where: { stripeCustomerId: customerId },
                        data: {
                            stripeCurrentPeriodEnd: periodEnd,
                        },
                    });
                    console.log(`[webhook] User for customer ${customerId} periodEnd updated to ${periodEnd.toISOString()}`);
                }
                break;
            }

            case "invoice.payment_failed": {
                const failedInvoice = event.data.object as unknown as { customer: string };
                const customerId = failedInvoice.customer;

                const failedUser = await prisma.user.findFirst({
                    where: { stripeCustomerId: customerId },
                });

                if (failedUser) {
                    console.warn(`[webhook] Payment failed for user ${failedUser.id} (customer ${customerId})`);
                } else {
                    console.warn(`[webhook] Payment failed for unknown customer ${customerId}`);
                }
                break;
            }
        }
    } catch (err: any) {
        console.error(`[webhook] Error handling ${(event as any)?.type ?? "unknown"}:`, err);
    }

    return new NextResponse(null, { status: 200 });
}
