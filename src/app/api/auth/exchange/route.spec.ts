import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
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

describe("Token Exchange Endpoint", () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV };
    });

    it("should return 401 if API key is invalid", async () => {
        const req = new NextRequest("http://localhost/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({ apiKey: "invalid" }),
            headers: { "Content-Type": "application/json" }
        });
        const res: any = await POST(req);

        expect(res.init?.status).toBe(401);
    });

    it("should issue a JWT with EXACT claims for a valid API key", async () => {
        // Mock the JWK private key
        const { privateKey } = await jose.generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
        const mockJwk = await jose.exportJWK(privateKey);
        mockJwk.kid = "test-kid-123";
        process.env.MARKETPLACE_JWK_PRIVATE = JSON.stringify(mockJwk);

        const req = new NextRequest("http://localhost/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({ apiKey: "valid-key-for-testing" }),
            headers: { "Content-Type": "application/json" }
        });
        const res: any = await POST(req);

        expect(res.init?.status).toBe(200);
        const token = res.body.token;
        expect(token).toBeDefined();

        // Decode and verify claims
        const decoded = jose.decodeJwt(token);
        expect(decoded).toHaveProperty("iss", "https://marketplace.worldwideview.dev");
        expect(decoded).toHaveProperty("sub");
        expect(decoded).toHaveProperty("aud");
        expect(decoded).toHaveProperty("exp");
        expect(decoded).toHaveProperty("nbf");
        expect(decoded).toHaveProperty("iat");
        expect(decoded).toHaveProperty("jti");
        expect(decoded).toHaveProperty("tier");
        expect(decoded).toHaveProperty("scope");

        // Exp should be 5 minutes (300 seconds) from iat
        expect(decoded.exp! - decoded.iat!).toBe(300);

        // Verify Header contains kid
        const header = jose.decodeProtectedHeader(token);
        expect(header).toHaveProperty("kid", "test-kid-123");
    });
});
