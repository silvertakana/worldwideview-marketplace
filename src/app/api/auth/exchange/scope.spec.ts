import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import * as jose from "jose";
import { hashApiKey } from "@/lib/auth/apiKeyHash";

interface MockJsonResponse {
    body: { token?: string; error?: string };
    init?: { status?: number };
}

vi.mock("next/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next/server")>();
    return { ...actual, NextResponse: { json: vi.fn((body, init) => ({ body, init })) } };
});

const PLAIN_KEY = "scope-spec-plain-key-32bytes-aa";
const SCOPED_KEY = "scope-spec-scoped-key-32bytes-bb";
const PLAIN_HASH = hashApiKey(PLAIN_KEY);
const SCOPED_HASH = hashApiKey(SCOPED_KEY);

vi.mock("@/lib/prisma", () => ({
    prisma: {
        marketplaceApiKey: {
            findUnique: vi.fn(({ where }: { where: { keyHash: string } }) => {
                if (where.keyHash === PLAIN_HASH) {
                    return Promise.resolve({ id: "k-plain", userId: "user-scope", revokedAt: null, scope: null, tier: null });
                }
                if (where.keyHash === SCOPED_HASH) {
                    return Promise.resolve({ id: "k-scoped", userId: "user-scope", revokedAt: null, scope: "plugins:read:earthquakes", tier: "demo" });
                }
                return Promise.resolve(null);
            }),
            update: vi.fn(() => Promise.resolve({})),
        },
    },
}));

const { mockGetActiveKey } = vi.hoisted(() => ({ mockGetActiveKey: vi.fn() }));
vi.mock("@/lib/auth/signingKey", () => ({ getActiveKey: mockGetActiveKey }));

async function exchange(body: Record<string, unknown>) {
    const req = new NextRequest("http://localhost/api/auth/exchange", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
    return (await POST(req)) as unknown as MockJsonResponse;
}

describe("Token Exchange - ticket scope and audience shape", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { privateKey } = await jose.generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
        mockGetActiveKey.mockResolvedValue({ kid: "test-kid-scope", privateKey });
    });

    it("mints a ticket carrying the scope stored on the key", async () => {
        const res = await exchange({ apiKey: SCOPED_KEY });
        expect(res.init?.status).toBe(200);
        const decoded = jose.decodeJwt(res.body.token!);
        expect(decoded.scope).toBe("plugins:read:earthquakes");
        expect(decoded.tier).toBe("demo");
    });

    it("falls back to the free read-only scope for a key with neither", async () => {
        const res = await exchange({ apiKey: PLAIN_KEY });
        const decoded = jose.decodeJwt(res.body.token!);
        expect(decoded.scope).toBe("plugins:read");
        expect(decoded.tier).toBe("free");
    });

    it("refuses an audience that cannot be an engine identifier", async () => {
        const res = await exchange({ apiKey: PLAIN_KEY, audience: { evil: true } });
        expect(res.init?.status).toBe(400);
        expect(res.body.token).toBeUndefined();
    });

    it("refuses an audience containing whitespace", async () => {
        const res = await exchange({ apiKey: PLAIN_KEY, audience: "engine one" });
        expect(res.init?.status).toBe(400);
    });
});
