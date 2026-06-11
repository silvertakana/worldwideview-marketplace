import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";
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

const { mockGetUser, mockFindUser, mockFindApiKey, mockUpdateApiKey, mockFindFirst } = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockFindUser: vi.fn(),
    mockFindApiKey: vi.fn(),
    mockUpdateApiKey: vi.fn(),
    mockFindFirst: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: () => ({
        auth: {
            getUser: mockGetUser,
        },
    }),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: mockFindUser,
        },
        marketplaceApiKey: {
            findFirst: mockFindFirst,
            update: mockUpdateApiKey,
        },
    },
}));

function makeRequest(id: string, authed = true): NextRequest {
    return new NextRequest(`http://localhost/api/account/api-keys/${id}`, {
        method: "DELETE",
    });
}

describe("DELETE /api/account/api-keys/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 401 when unauthenticated", async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: null } });

        const req = makeRequest("key-123", false);
        const res: any = await DELETE(req, { params: Promise.resolve({ id: "key-123" }) });

        expect(res.init?.status).toBe(401);
        expect(mockFindApiKey).not.toHaveBeenCalled();
    });

    it("returns 404 when marketplace user not found", async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: { id: "supa-user-1" } } });
        mockFindUser.mockResolvedValueOnce(null);

        const req = makeRequest("key-123");
        const res: any = await DELETE(req, { params: Promise.resolve({ id: "key-123" }) });

        expect(res.init?.status).toBe(404);
    });

    it("returns 404 when API key does not exist", async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: { id: "supa-user-1" } } });
        mockFindUser.mockResolvedValueOnce({ id: "local-user-1", supabaseUserId: "supa-user-1" });
        mockFindFirst.mockResolvedValueOnce(null);

        const req = makeRequest("key-999");
        const res: any = await DELETE(req, { params: Promise.resolve({ id: "key-999" }) });

        expect(res.init?.status).toBe(404);
        expect(res.body.error).toBe("API key not found");
    });

    it("returns 404 when key belongs to a different user (cross-user)", async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: { id: "supa-user-1" } } });
        mockFindUser.mockResolvedValueOnce({ id: "local-user-1", supabaseUserId: "supa-user-1" });
        // The key exists but its userId doesn't match local-user-1
        mockFindFirst.mockResolvedValueOnce(null); // scoped query returns nothing

        const req = makeRequest("other-user-key");
        const res: any = await DELETE(req, { params: Promise.resolve({ id: "other-user-key" }) });

        expect(res.init?.status).toBe(404);
        expect(res.body.error).toBe("API key not found");
        // Verify the query was scoped to the current user
        expect(mockFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "other-user-key", userId: "local-user-1" } }),
        );
    });

    it("revokes own key and returns 200", async () => {
        const keyRecord = {
            id: "key-123",
            userId: "local-user-1",
            keyHash: "hash123",
            name: "My Key",
            createdAt: new Date(),
            revokedAt: null,
        };

        mockGetUser.mockResolvedValueOnce({ data: { user: { id: "supa-user-1" } } });
        mockFindUser.mockResolvedValueOnce({ id: "local-user-1", supabaseUserId: "supa-user-1" });
        mockFindFirst.mockResolvedValueOnce(keyRecord);
        mockUpdateApiKey.mockResolvedValueOnce({ ...keyRecord, revokedAt: new Date() });

        const req = makeRequest("key-123");
        const res: any = await DELETE(req, { params: Promise.resolve({ id: "key-123" }) });

        expect(res.init?.status).toBeUndefined(); // 200 default
        expect(res.body.success).toBe(true);
        expect(mockUpdateApiKey).toHaveBeenCalledWith({
            where: { id: "key-123" },
            data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        });
    });

    it("is idempotent for already-revoked keys (returns 200)", async () => {
        const revokedDate = new Date();
        const keyRecord = {
            id: "key-123",
            userId: "local-user-1",
            keyHash: "hash123",
            name: "My Key",
            createdAt: new Date(),
            revokedAt: revokedDate,
        };

        mockGetUser.mockResolvedValueOnce({ data: { user: { id: "supa-user-1" } } });
        mockFindUser.mockResolvedValueOnce({ id: "local-user-1", supabaseUserId: "supa-user-1" });
        mockFindFirst.mockResolvedValueOnce(keyRecord);

        const req = makeRequest("key-123");
        const res: any = await DELETE(req, { params: Promise.resolve({ id: "key-123" }) });

        expect(res.init?.status).toBeUndefined(); // 200 default
        expect(res.body.success).toBe(true);
        expect(res.body.revokedAt).toEqual(revokedDate);
        // Should NOT call update since it's already revoked
        expect(mockUpdateApiKey).not.toHaveBeenCalled();
    });

    it("returns 500 on internal error", async () => {
        mockGetUser.mockRejectedValueOnce(new Error("DB connection failed"));

        const req = makeRequest("key-123");
        const res: any = await DELETE(req, { params: Promise.resolve({ id: "key-123" }) });

        expect(res.init?.status).toBe(500);
    });
});
