import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
        case "checkout.session.completed":
            await handleCheckoutCompleted(event.data.object);
            break;

        case "customer.subscription.updated":
            await handleSubscriptionUpdated(event.data.object);
            break;

        case "customer.subscription.deleted":
            await handleSubscriptionDeleted(event.data.object);
            break;

        case "invoice.payment_succeeded":
            await handleInvoicePaymentSucceeded(event.data.object);
            break;

        case "invoice.payment_failed":
            await handleInvoicePaymentFailed(event.data.object);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
}

async function handleCheckoutCompleted(
    session: Stripe.Checkout.Session
): Promise<void> {
    if (!session.client_reference_id || !session.subscription) return;

    const user = await prisma.user.findFirst({
        where: { supabaseUserId: session.client_reference_id },
    });

    if (!user) {
        console.log(`Checkout: no marketplace user for ${session.client_reference_id}`);
        return;
    }

    const stripeCustomerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;

    const subscriptionId =
        typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

    const currentCustomerId = user.stripeCustomerId;
    const currentSubscriptionId = user.stripeSubscriptionId;

    if (
        currentCustomerId === stripeCustomerId &&
        currentSubscriptionId === subscriptionId
    ) {
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            stripeCustomerId,
            stripeSubscriptionId: subscriptionId,
        },
    });
}

async function handleSubscriptionUpdated(
    subscription: Stripe.Subscription
): Promise<void> {
    const stripeCustomerId =
        typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

    if (!stripeCustomerId) return;

    const user = await prisma.user.findFirst({
        where: { stripeCustomerId },
    });

    if (!user) {
        console.log(`Subscription update: no user for customer ${stripeCustomerId}`);
        return;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;

    if (
        user.stripePriceId === priceId &&
        user.stripeCurrentPeriodEnd?.getTime() === currentPeriodEnd?.getTime()
    ) {
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId ?? user.stripePriceId,
            stripeCurrentPeriodEnd: currentPeriodEnd ?? user.stripeCurrentPeriodEnd,
            tier: subscription.status === "active" ? "pro" : user.tier,
        },
    });
}

async function handleSubscriptionDeleted(
    subscription: Stripe.Subscription
): Promise<void> {
    const stripeCustomerId =
        typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

    if (!stripeCustomerId) return;

    const user = await prisma.user.findFirst({
        where: { stripeCustomerId },
    });

    if (!user) return;

    if (!user.stripeSubscriptionId) return;

    await prisma.user.update({
        where: { id: user.id },
        data: {
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
            tier: "free",
        },
    });
}

async function handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice
): Promise<void> {
    if (!invoice.subscription) return;

    const subscriptionId =
        typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id;

    if (!subscriptionId) return;

    const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
    });

    if (!user) return;

    const currentPeriodEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null;

    if (
        currentPeriodEnd &&
        user.stripeCurrentPeriodEnd?.getTime() === currentPeriodEnd.getTime()
    ) {
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: currentPeriodEnd
            ? { stripeCurrentPeriodEnd: currentPeriodEnd }
            : {},
    });
}

async function handleInvoicePaymentFailed(
    invoice: Stripe.Invoice
): Promise<void> {
    if (!invoice.subscription) return;

    const subscriptionId =
        typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id;

    if (!subscriptionId) return;

    const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
    });

    if (!user) return;

    const currentPeriodEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null;

    await prisma.user.update({
        where: { id: user.id },
        data: currentPeriodEnd
            ? { stripeCurrentPeriodEnd: currentPeriodEnd }
            : {},
    });
}
