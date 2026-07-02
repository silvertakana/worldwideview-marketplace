import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("next/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next/server")>();
    return {
        ...actual,
        NextResponse: {
            json: vi.fn((body, init) => ({ body, init })),
        },
    };
});

const { mockRotateKey, mockHashApiKey, mockFindUnique } = vi.hoisted(() => ({
    mockRotateKey: vi.fn(),
    mockHashApiKey: vi.fn((raw: string) => `sha256:${raw}`),
    mockFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/signingKey", () => ({
    rotateKey: mockRotateKey,
}));

vi.mock("@/lib/auth/apiKeyHash", () => ({
    hashApiKey: mockHashApiKey,
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        marketplaceApiKey: {
            findUnique: mockFindUnique,
            update: vi.fn(() => Promise.resolve({})),
        },
    },
}));

describe("Admin Rotate Key Endpoint", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.CRON_SECRET;
    });

    it("rotates the key and returns old/new kids", async () => {
        process.env.CRON_SECRET = "test-secret";
        mockRotateKey.mockResolvedValueOnce({ oldKid: "kid-old", newKid: "kid-new" });

        const req = new NextRequest("http://localhost/api/admin/rotate-key", {
            method: "POST",
            headers: { authorization: "Bearer test-secret" },
        });
        const res: any = await POST(req);

        expect(res.init?.status).toBeUndefined(); // 200 default
        expect(res.body.success).toBe(true);
        expect(res.body.oldKid).toBe("kid-old");
        expect(res.body.newKid).toBe("kid-new");
    });

    it("returns 401 when auth header is missing", async () => {
        delete process.env.CRON_SECRET;

        const req = new NextRequest("http://localhost/api/admin/rotate-key", { method: "POST" });
        const res: any = await POST(req);

        expect(res.init?.status).toBe(401);
        expect(mockRotateKey).not.toHaveBeenCalled();
    });

    it("returns 401 when CRON_SECRET is set but auth header is wrong", async () => {
        process.env.CRON_SECRET = "super-secret";

        const req = new NextRequest("http://localhost/api/admin/rotate-key", {
            method: "POST",
            headers: { authorization: "Bearer wrong-secret" },
        });
        const res: any = await POST(req);

        expect(res.init?.status).toBe(401);
    });

    it("accepts request when CRON_SECRET is set and auth header matches", async () => {
        process.env.CRON_SECRET = "super-secret";
        mockRotateKey.mockResolvedValueOnce({ oldKid: "kid-old", newKid: "kid-new" });

        const req = new NextRequest("http://localhost/api/admin/rotate-key", {
            method: "POST",
            headers: { authorization: "Bearer super-secret" },
        });
        const res: any = await POST(req);

        expect(res.body.success).toBe(true);
        expect(mockRotateKey).toHaveBeenCalledOnce();
    });

    it("accepts valid API key when CRON_SECRET is not configured", async () => {
        delete process.env.CRON_SECRET;
        mockHashApiKey.mockReturnValueOnce("sha256:valid-key-hash");
        mockFindUnique.mockResolvedValueOnce({
            id: "key-1",
            userId: "user-1",
            revokedAt: null,
        });
        mockRotateKey.mockResolvedValueOnce({ oldKid: "kid-old", newKid: "kid-new" });

        const req = new NextRequest("http://localhost/api/admin/rotate-key", {
            method: "POST",
            headers: { authorization: "Bearer mk_valid_key_123" },
        });
        const res: any = await POST(req);

        expect(res.body.success).toBe(true);
        expect(mockRotateKey).toHaveBeenCalledOnce();
    });

    it("rejects revoked API key when CRON_SECRET is not configured", async () => {
        delete process.env.CRON_SECRET;
        mockHashApiKey.mockReturnValueOnce("sha256:revoked-key-hash");
        mockFindUnique.mockResolvedValueOnce({
            id: "key-2",
            userId: "user-1",
            revokedAt: new Date(),
        });

        const req = new NextRequest("http://localhost/api/admin/rotate-key", {
            method: "POST",
            headers: { authorization: "Bearer mk_revoked_key" },
        });
        const res: any = await POST(req);

        expect(res.init?.status).toBe(401);
        expect(mockRotateKey).not.toHaveBeenCalled();
    });

    it("returns 500 on rotation failure", async () => {
        process.env.CRON_SECRET = "test-secret";
        mockRotateKey.mockRejectedValueOnce(new Error("DB error"));

        const req = new NextRequest("http://localhost/api/admin/rotate-key", {
            method: "POST",
            headers: { authorization: "Bearer test-secret" },
        });
        const res: any = await POST(req);

        expect(res.init?.status).toBe(500);
    });
});
