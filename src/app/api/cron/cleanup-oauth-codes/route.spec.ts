import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("next/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next/server")>();
    return {
        ...actual,
        NextResponse: {
            json: vi.fn((body: unknown, init?: { status?: number }) => ({ body, init })),
        },
    };
});

const { mockDeleteMany } = vi.hoisted(() => ({
    mockDeleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        oAuthAuthorizationCode: {
            deleteMany: mockDeleteMany,
        },
    },
}));

function makeRequest(authed = true): NextRequest {
    const headers: Record<string, string> = {};
    if (authed) {
        headers["authorization"] = "Bearer test-cron-secret";
    }
    return new NextRequest("http://localhost/api/cron/cleanup-oauth-codes", {
        headers,
    });
}

describe("GET /api/cron/cleanup-oauth-codes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = "test-cron-secret";
    });

    it("returns 503 when CRON_SECRET is not configured", async () => {
        delete process.env.CRON_SECRET;

        const res: any = await GET(makeRequest(false));

        expect(res.init?.status).toBe(503);
        expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it("returns 401 when auth header is missing", async () => {
        const res: any = await GET(makeRequest(false));

        expect(res.init?.status).toBe(401);
        expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it("returns 401 when auth header is wrong", async () => {
        const req = new NextRequest(
            "http://localhost/api/cron/cleanup-oauth-codes",
            { headers: { authorization: "Bearer wrong-secret" } },
        );
        const res: any = await GET(req);

        expect(res.init?.status).toBe(401);
        expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it("no expired codes: returns 0 deletedCount (no-op)", async () => {
        mockDeleteMany.mockResolvedValueOnce({ count: 0 });

        const res: any = await GET(makeRequest(true));

        expect(res.init?.status).toBeUndefined(); // 200 default
        expect(res.body.success).toBe(true);
        expect(res.body.deletedCount).toBe(0);
    });

    it("expired codes exist: deletes them and returns count", async () => {
        mockDeleteMany.mockResolvedValueOnce({ count: 5 });

        const res: any = await GET(makeRequest(true));

        expect(res.body.success).toBe(true);
        expect(res.body.deletedCount).toBe(5);
    });

    it("only expired codes deleted (active codes remain)", async () => {
        mockDeleteMany.mockResolvedValueOnce({ count: 3 });

        const res: any = await GET(makeRequest(true));

        // Verify the query filters by expiresAt < threshold
        expect(mockDeleteMany).toHaveBeenCalledWith({
            where: {
                expiresAt: expect.objectContaining({ lt: expect.any(Date) }),
            },
        });
        expect(res.body.deletedCount).toBe(3);
    });

    it("returns 500 on internal error", async () => {
        mockDeleteMany.mockRejectedValueOnce(new Error("DB error"));

        const res: any = await GET(makeRequest(true));

        expect(res.init?.status).toBe(500);
    });
});
