import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock("@/lib/stripe/client", () => ({
    stripe: {
        webhooks: {
            constructEvent: vi.fn(),
        },
    },
}));

describe("POST /api/billing/webhook", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
    });

    it("returns 400 on signature verification failure", async () => {
        const { stripe } = await import("@/lib/stripe/client");
        (stripe.webhooks.constructEvent as any).mockImplementation(() => {
            throw new Error("Invalid signature");
        });

        const { POST } = await import("@/app/api/billing/webhook/route");

        const req = new Request("http://localhost:3000/api/billing/webhook", {
            method: "POST",
            body: "fake-body",
            headers: { "stripe-signature": "bad_sig" },
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("returns 200 on successful event processing", async () => {
        const { stripe } = await import("@/lib/stripe/client");
        (stripe.webhooks.constructEvent as any).mockReturnValue({
            type: "checkout.session.completed",
            data: {
                object: {
                    client_reference_id: "user_123",
                    subscription: "sub_test",
                    customer: "cus_test",
                },
            },
        });

        const { prisma } = await import("@/lib/prisma");
        (prisma.user.findFirst as any).mockResolvedValue({
            id: "mp_user_1",
            stripeCustomerId: null,
            stripeSubscriptionId: null,
        });
        (prisma.user.update as any).mockResolvedValue({});

        const { POST } = await import("@/app/api/billing/webhook/route");

        const req = new Request("http://localhost:3000/api/billing/webhook", {
            method: "POST",
            body: "fake-body",
            headers: { "stripe-signature": "valid_sig" },
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });
});

describe("handleStripeEvent", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
    });

    it("handles checkout.session.completed", async () => {
        const { prisma } = await import("@/lib/prisma");
        (prisma.user.findFirst as any).mockResolvedValue({
            id: "mp_user_1",
            stripeCustomerId: null,
            stripeSubscriptionId: null,
        });
        (prisma.user.update as any).mockResolvedValue({});

        const { handleStripeEvent } = await import(
            "@/lib/billing/webhookHandler"
        );

        await handleStripeEvent({
            type: "checkout.session.completed",
            data: {
                object: {
                    client_reference_id: "user_123",
                    subscription: "sub_test",
                    customer: "cus_test",
                },
            },
        } as any);

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    stripeCustomerId: "cus_test",
                    stripeSubscriptionId: "sub_test",
                }),
            })
        );
    });

    it("skips idempotent duplicate checkout.session.completed", async () => {
        const { prisma } = await import("@/lib/prisma");
        (prisma.user.findFirst as any).mockResolvedValue({
            id: "mp_user_1",
            stripeCustomerId: "cus_test",
            stripeSubscriptionId: "sub_test",
        });
        (prisma.user.update as any).mockResolvedValue({});

        const { handleStripeEvent } = await import(
            "@/lib/billing/webhookHandler"
        );

        await handleStripeEvent({
            type: "checkout.session.completed",
            data: {
                object: {
                    client_reference_id: "user_123",
                    subscription: "sub_test",
                    customer: "cus_test",
                },
            },
        } as any);

        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("handles customer.subscription.deleted", async () => {
        const { prisma } = await import("@/lib/prisma");
        (prisma.user.findFirst as any).mockResolvedValue({
            id: "mp_user_1",
            stripeSubscriptionId: "sub_test",
        });
        (prisma.user.update as any).mockResolvedValue({});

        const { handleStripeEvent } = await import(
            "@/lib/billing/webhookHandler"
        );

        await handleStripeEvent({
            type: "customer.subscription.deleted",
            data: {
                object: {
                    customer: "cus_test",
                },
            },
        } as any);

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    stripeSubscriptionId: null,
                    tier: "free",
                }),
            })
        );
    });
});
