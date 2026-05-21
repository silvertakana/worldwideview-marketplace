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

describe("JWKS Endpoint", () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV };
    });

    it("should return 500 if MARKETPLACE_JWK_PRIVATE is not set", async () => {
        delete process.env.MARKETPLACE_JWK_PRIVATE;
        const req = new NextRequest("http://localhost/api/auth/jwks");
        const res: any = await GET(req);

        expect(res.init?.status).toBe(500);
        expect(res.body).toEqual({ error: "Internal Server Error" });
    });

    it("should return 500 if MARKETPLACE_JWK_PRIVATE is missing kid", async () => {
        const { privateKey } = await jose.generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
        const privateJwk = await jose.exportJWK(privateKey);
        // Deliberately omit kid and alg
        delete privateJwk.kid;
        delete (privateJwk as any).alg;
        process.env.MARKETPLACE_JWK_PRIVATE = JSON.stringify(privateJwk);

        const req = new NextRequest("http://localhost/api/auth/jwks");
        const res: any = await GET(req);

        expect(res.init?.status).toBe(500);
    });

    it("should return the public JWKS when configured correctly", async () => {
        // Generate a real Ed25519 key for testing
        const { privateKey } = await jose.generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
        const privateJwk = await jose.exportJWK(privateKey);
        privateJwk.kid = "test-kid-jwks";
        (privateJwk as any).alg = "EdDSA";
        process.env.MARKETPLACE_JWK_PRIVATE = JSON.stringify(privateJwk);

        const req = new NextRequest("http://localhost/api/auth/jwks");
        const res: any = await GET(req);

        expect(res.init?.status).toBe(200);

        const cacheControl: string = res.init?.headers?.["Cache-Control"] ?? "";
        expect(cacheControl).toContain("max-age=300");
        expect(cacheControl).toContain("stale-while-revalidate=60");

        const keys = res.body.keys;
        expect(Array.isArray(keys)).toBe(true);
        expect(keys.length).toBe(1);

        const publicJwk = keys[0];
        expect(publicJwk.crv).toBe("Ed25519");
        expect(publicJwk.kty).toBe("OKP");
        expect(publicJwk.kid).toBe("test-kid-jwks");
        // Private parts should NOT be present
        expect(publicJwk).not.toHaveProperty("d");
    });
});
