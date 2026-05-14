import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apiKey } = body;

        // Stub verification: in real app, query DB
        if (apiKey !== "valid-key-for-testing") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const jwkString = process.env.MARKETPLACE_JWK_PRIVATE;
        if (!jwkString) {
            console.error("MARKETPLACE_JWK_PRIVATE is not configured.");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const privateJwk = JSON.parse(jwkString);
        const privateKey = await jose.importJWK(privateJwk, "EdDSA");

        const now = Math.floor(Date.now() / 1000);
        
        const jwt = await new jose.SignJWT({
            tier: "pro", // Stub
            scope: "plugins:read" // Stub
        })
            .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid: privateJwk.kid })
            .setIssuer("https://marketplace.worldwideview.dev")
            .setSubject("user-id-stub")
            .setAudience("wwv-data-engines")
            .setExpirationTime(now + 300) // 5 minutes
            .setNotBefore(now)
            .setIssuedAt(now)
            .setJti(crypto.randomUUID())
            .sign(privateKey);

        return NextResponse.json({ token: jwt }, { status: 200 });

    } catch (error) {
        console.error("Token exchange failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
