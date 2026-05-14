import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

export async function GET(req: NextRequest) {
    const jwkString = process.env.MARKETPLACE_JWK_PRIVATE;
    if (!jwkString) {
        console.error("MARKETPLACE_JWK_PRIVATE is not configured.");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    try {
        const privateJwk = JSON.parse(jwkString);
        
        // Ensure it's Ed25519
        if (privateJwk.crv !== "Ed25519") {
            throw new Error("Only Ed25519 keys are supported.");
        }

        // Generate public JWK by stripping private parts ('d')
        const publicJwk = { ...privateJwk };
        delete publicJwk.d;

        return NextResponse.json({ keys: [publicJwk] }, {
            status: 200,
            headers: {
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400"
            }
        });
    } catch (error) {
        console.error("Failed to parse or export JWKS:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
