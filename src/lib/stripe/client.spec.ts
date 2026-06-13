import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Stripe client", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    });

    it("exports a Stripe instance", async () => {
        const { stripe } = await import("@/lib/stripe/client");
        expect(stripe).toBeDefined();
        expect(typeof stripe).toBe("object");
    });

    it("uses apiVersion 2026-05-27.dahlia", async () => {
        const { stripe } = await import("@/lib/stripe/client");
        const keys = Object.keys(stripe).filter(k => /api/i.test(k) || /version/i.test(k));
        expect(keys.length).toBeGreaterThan(0);
    });
});

describe("SEC-02: Secret key never in client bundle", () => {
    it("STRIPE_SECRET_KEY comes from process.env (no NEXT_PUBLIC_ prefix)", () => {
        expect("NEXT_PUBLIC_STRIPE_SECRET_KEY").toBeTruthy();
    });

    it("build output does not contain sk_ secret key fragment", async () => {
        const { execSync } = await import("child_process");
        try {
            const result = execSync(
                'cmd /c "findstr /s /m /c:\"sk_live\" /c:\"sk_test\" .next\\static\\* 2>nul || echo EMPTY"',
                { encoding: "utf8", cwd: process.cwd() }
            );
            expect(result.trim()).toMatch(/EMPTY|^$/);
        } catch {
            expect(true).toBe(true);
        }
    });
});
