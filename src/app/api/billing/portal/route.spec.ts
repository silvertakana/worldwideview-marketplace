import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
    stripe: {
        billingPortal: {
            sessions: {
                create: vi.fn(),
            },
        },
    },
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

describe("POST /api/billing/portal", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
    });

    it("returns 401 without auth", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        (createClient as any).mockResolvedValue({
            auth: {
                getUser: () => ({ data: { user: null }, error: null }),
            },
        });

        const { POST } = await import("@/app/api/billing/portal/route");

        const req = new Request("http://localhost:3000/api/billing/portal", {
            method: "POST",
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it("returns 400 when user has no stripeCustomerId", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        (createClient as any).mockResolvedValue({
            auth: {
                getUser: () => ({
                    data: { user: { id: "user_123" } },
                    error: null,
                }),
            },
        });

        const { prisma } = await import("@/lib/prisma");
        (prisma.user.findUnique as any).mockResolvedValue({
            id: "mp_user_1",
            stripeCustomerId: null,
        });

        const { POST } = await import("@/app/api/billing/portal/route");

        const req = new Request("http://localhost:3000/api/billing/portal", {
            method: "POST",
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toContain("Subscribe first");
    });

    it("returns portal URL for subscribed user", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        (createClient as any).mockResolvedValue({
            auth: {
                getUser: () => ({
                    data: { user: { id: "user_123" } },
                    error: null,
                }),
            },
        });

        const { prisma } = await import("@/lib/prisma");
        (prisma.user.findUnique as any).mockResolvedValue({
            id: "mp_user_1",
            stripeCustomerId: "cus_test123",
        });

        const { stripe } = await import("@/lib/stripe/client");
        (stripe.billingPortal.sessions.create as any).mockResolvedValue({
            url: "https://billing.stripe.com/session/test",
        });

        const { POST } = await import("@/app/api/billing/portal/route");

        const req = new Request("http://localhost:3000/api/billing/portal", {
            method: "POST",
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.url).toContain("billing.stripe.com");
    });
});
