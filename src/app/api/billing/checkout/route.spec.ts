import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
    stripe: {
        checkout: {
            sessions: {
                create: vi.fn(),
            },
        },
    },
}));

describe("POST /api/billing/checkout", () => {
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

        const { POST } = await import("@/app/api/billing/checkout/route");

        const req = new Request("http://localhost:3000/api/billing/checkout", {
            method: "POST",
            body: JSON.stringify({ priceId: "pro_monthly" }),
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it("returns 400 for invalid price ID", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        (createClient as any).mockResolvedValue({
            auth: {
                getUser: () => ({
                    data: { user: { id: "user_123" } },
                    error: null,
                }),
            },
        });

        const { POST } = await import("@/app/api/billing/checkout/route");

        const req = new Request("http://localhost:3000/api/billing/checkout", {
            method: "POST",
            body: JSON.stringify({ priceId: "invalid_price" }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("returns checkout URL for valid price", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        (createClient as any).mockResolvedValue({
            auth: {
                getUser: () => ({
                    data: { user: { id: "user_123" } },
                    error: null,
                }),
            },
        });

        const { stripe } = await import("@/lib/stripe/client");
        (stripe.checkout.sessions.create as any).mockResolvedValue({
            url: "https://checkout.stripe.com/c/test",
        });

        const { POST } = await import("@/app/api/billing/checkout/route");

        const req = new Request("http://localhost:3000/api/billing/checkout", {
            method: "POST",
            body: JSON.stringify({ priceId: "pro_monthly" }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.url).toContain("checkout.stripe.com");
        expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "subscription",
                client_reference_id: "user_123",
            })
        );
    });
});
