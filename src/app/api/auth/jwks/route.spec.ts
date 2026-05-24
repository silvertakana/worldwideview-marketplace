import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import * as jose from "jose";

vi.mock("next/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next/server")>();
    return {
        ...actual,
        NextResponse: {
            json: vi.fn((body, init) => ({ body, init })),
        },
    };
});

const { mockGetJwksPublicKeys } = vi.hoisted(() => ({
    mockGetJwksPublicKeys: vi.fn(),
}));

vi.mock("@/lib/auth/signingKey", () => ({
    getJwksPublicKeys: mockGetJwksPublicKeys,
}));

describe("JWKS Endpoint", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should return 500 if key retrieval throws", async () => {
        mockGetJwksPublicKeys.mockRejectedValueOnce(new Error("DB unavailable"));

        const req = new NextRequest("http://localhost/api/auth/jwks");
        const res: any = await GET(req);

        expect(res.init?.status).toBe(500);
        expect(res.body).toEqual({ error: "Internal Server Error" });
    });

    it("should return JWKS with active keys", async () => {
        const { publicKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
        const publicJwk = { ...(await jose.exportJWK(publicKey)), kid: "test-kid-jwks", alg: "EdDSA", kty: "OKP", crv: "Ed25519" };
        mockGetJwksPublicKeys.mockResolvedValueOnce([publicJwk]);

        const req = new NextRequest("http://localhost/api/auth/jwks");
        const res: any = await GET(req);

        expect(res.init?.status).toBe(200);
        const cacheControl: string = res.init?.headers?.["Cache-Control"] ?? "";
        expect(cacheControl).toContain("max-age=300");
        expect(cacheControl).toContain("stale-while-revalidate=60");

        const keys = res.body.keys;
        expect(Array.isArray(keys)).toBe(true);
        expect(keys).toHaveLength(1);
        expect(keys[0].kid).toBe("test-kid-jwks");
        expect(keys[0].crv).toBe("Ed25519");
        expect(keys[0]).not.toHaveProperty("d");
    });

    it("should return multiple keys during a rotation overlap window", async () => {
        const makeKey = async (kid: string) => {
            const { publicKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
            return { ...(await jose.exportJWK(publicKey)), kid, alg: "EdDSA", kty: "OKP", crv: "Ed25519" };
        };
        const activeJwk = await makeKey("kid-active");
        const retiringJwk = await makeKey("kid-retiring");
        mockGetJwksPublicKeys.mockResolvedValueOnce([activeJwk, retiringJwk]);

        const req = new NextRequest("http://localhost/api/auth/jwks");
        const res: any = await GET(req);

        expect(res.init?.status).toBe(200);
        expect(res.body.keys).toHaveLength(2);
        const kids = res.body.keys.map((k: any) => k.kid);
        expect(kids).toContain("kid-active");
        expect(kids).toContain("kid-retiring");
    });
});
