import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import * as jose from "jose";
import { hashApiKey } from "@/lib/auth/apiKeyHash";

vi.mock("next/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next/server")>();
    return {
        ...actual,
        NextResponse: {
            json: vi.fn((body, init) => ({ body, init })),
        },
    };
});

const FIXTURE_USER = { id: "user-abc123", email: "test@example.com", tier: "pro", createdAt: new Date() };
const FIXTURE_KEY_RAW = "test-api-key-fixture-32bytes-xyz";
const FIXTURE_KEY_HASH = hashApiKey(FIXTURE_KEY_RAW);
const REVOKED_KEY_RAW = "revoked-api-key-fixture-32bytes!";
const REVOKED_KEY_HASH = hashApiKey(REVOKED_KEY_RAW);

vi.mock("@/lib/prisma", () => ({
    prisma: {
        marketplaceApiKey: {
            findUnique: vi.fn(({ where }: { where: { keyHash: string } }) => {
                if (where.keyHash === FIXTURE_KEY_HASH) {
                    return Promise.resolve({ id: "key-1", userId: FIXTURE_USER.id, keyHash: FIXTURE_KEY_HASH, revokedAt: null, user: FIXTURE_USER });
                }
                if (where.keyHash === REVOKED_KEY_HASH) {
                    return Promise.resolve({ id: "key-2", userId: FIXTURE_USER.id, keyHash: REVOKED_KEY_HASH, revokedAt: new Date(), user: FIXTURE_USER });
                }
                return Promise.resolve(null);
            }),
            update: vi.fn(() => Promise.resolve({})),
        },
    },
}));

describe("Token Exchange Endpoint", () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(async () => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV };

        // Set up a real Ed25519 key for JWT signing tests
        const { privateKey } = await jose.generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
        const mockJwk = await jose.exportJWK(privateKey);
        mockJwk.kid = "test-kid-exchange";
        (mockJwk as any).alg = "EdDSA";
        process.env.MARKETPLACE_JWK_PRIVATE = JSON.stringify(mockJwk);
    });

    it("should return 400 if apiKey is missing", async () => {
        const req = new NextRequest("http://localhost/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({}),
            headers: { "Content-Type": "application/json" },
        });
        const res: any = await POST(req);
        expect(res.init?.status).toBe(400);
    });

    it("should return 401 if API key is not found in DB", async () => {
        const req = new NextRequest("http://localhost/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({ apiKey: "unknown-key" }),
            headers: { "Content-Type": "application/json" },
        });
        const res: any = await POST(req);
        expect(res.init?.status).toBe(401);
    });

    it("should return 401 if API key is revoked", async () => {
        const req = new NextRequest("http://localhost/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({ apiKey: REVOKED_KEY_RAW }),
            headers: { "Content-Type": "application/json" },
        });
        const res: any = await POST(req);
        expect(res.init?.status).toBe(401);
    });

    it("should issue a JWT with correct claims for a valid API key", async () => {
        const req = new NextRequest("http://localhost/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({ apiKey: FIXTURE_KEY_RAW, audience: "wwv-aviation-engine", plugin_id: "aviation" }),
            headers: { "Content-Type": "application/json" },
        });
        const res: any = await POST(req);

        expect(res.init?.status).toBe(200);
        const token = res.body.token;
        expect(token).toBeDefined();

        const decoded = jose.decodeJwt(token);
        expect(decoded.iss).toBe("https://marketplace.worldwideview.dev");
        expect(decoded.sub).toBe(FIXTURE_USER.id);
        expect(decoded.aud).toBe("wwv-aviation-engine");
        expect(decoded.tier).toBe("pro");
        expect(decoded.scope).toBe("plugins:read plugins:write");
        expect(decoded.exp! - decoded.iat!).toBe(300);

        const header = jose.decodeProtectedHeader(token);
        expect(header.kid).toBe("test-kid-exchange");
        expect(header.alg).toBe("EdDSA");
    });

    it("should default audience to 'wwv-data-engine' when not provided", async () => {
        const req = new NextRequest("http://localhost/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({ apiKey: FIXTURE_KEY_RAW }),
            headers: { "Content-Type": "application/json" },
        });
        const res: any = await POST(req);

        expect(res.init?.status).toBe(200);
        const decoded = jose.decodeJwt(res.body.token);
        expect(decoded.aud).toBe("wwv-data-engine");
    });

    it("should return 401 for the old stub key 'valid-key-for-testing'", async () => {
        const req = new NextRequest("http://localhost/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({ apiKey: "valid-key-for-testing" }),
            headers: { "Content-Type": "application/json" },
        });
        const res: any = await POST(req);
        expect(res.init?.status).toBe(401);
    });
});
