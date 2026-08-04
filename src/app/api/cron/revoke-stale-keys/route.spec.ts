import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
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

const { mockUpdateMany } = vi.hoisted(() => ({
    mockUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        marketplaceApiKey: {
            updateMany: mockUpdateMany,
        },
    },
}));

describe("Cron Revoke Stale Keys Endpoint", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.CRON_SECRET;
    });

    it("returns 401 when auth header is missing", async () => {
        process.env.CRON_SECRET = "test-secret";

        const req = new NextRequest("http://localhost/api/cron/revoke-stale-keys", { method: "GET" });
        const res: any = await GET(req);

        expect(res.init?.status).toBe(401);
        expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("returns 401 when auth header does not match CRON_SECRET", async () => {
        process.env.CRON_SECRET = "test-secret";

        const req = new NextRequest("http://localhost/api/cron/revoke-stale-keys", {
            method: "GET",
            headers: { authorization: "Bearer wrong-secret" },
        });
        const res: any = await GET(req);

        expect(res.init?.status).toBe(401);
        expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("returns 503 when CRON_SECRET is not configured", async () => {
        const req = new NextRequest("http://localhost/api/cron/revoke-stale-keys", { method: "GET" });
        const res: any = await GET(req);

        expect(res.init?.status).toBe(503);
        expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("revokes stale keys with the right where clause and returns the count", async () => {
        process.env.CRON_SECRET = "test-secret";
        mockUpdateMany.mockResolvedValueOnce({ count: 3 });

        const req = new NextRequest("http://localhost/api/cron/revoke-stale-keys", {
            method: "GET",
            headers: { authorization: "Bearer test-secret" },
        });
        const res: any = await GET(req);

        expect(res.init?.status).toBeUndefined(); // 200 default
        expect(res.body.success).toBe(true);
        expect(res.body.revoked).toBe(3);
        expect(mockUpdateMany).toHaveBeenCalledTimes(1);

        const [args] = mockUpdateMany.mock.calls[0];
        expect(args.where.origin).toBeNull();
        expect(args.where.lastUsedAt.lt).toBeInstanceOf(Date);
        const cutoff = Date.now() - 30 * 86400_000;
        expect(args.where.lastUsedAt.lt.getTime()).toBeGreaterThan(cutoff - 60_000);
        expect(args.where.lastUsedAt.lt.getTime()).toBeLessThanOrEqual(cutoff + 60_000);
        expect(args.data.revokedAt).toBeInstanceOf(Date);
    });

    it("returns 500 on database failure", async () => {
        process.env.CRON_SECRET = "test-secret";
        mockUpdateMany.mockRejectedValueOnce(new Error("DB error"));

        const req = new NextRequest("http://localhost/api/cron/revoke-stale-keys", {
            method: "GET",
            headers: { authorization: "Bearer test-secret" },
        });
        const res: any = await GET(req);

        expect(res.init?.status).toBe(500);
    });
});
