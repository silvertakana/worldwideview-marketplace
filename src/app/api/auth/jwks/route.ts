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

        if (!privateJwk.kid) {
            console.error("MARKETPLACE_JWK_PRIVATE is missing 'kid' field — regenerate per README.");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        if (!privateJwk.alg) {
            console.error("MARKETPLACE_JWK_PRIVATE is missing 'alg' field — regenerate per README.");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        // Generate public JWK by stripping private parts ('d')
        const publicJwk = { ...privateJwk };
        delete publicJwk.d;

        return NextResponse.json({ keys: [publicJwk] }, {
            status: 200,
            headers: {
                "Cache-Control": "public, max-age=300, stale-while-revalidate=60"
            }
        });
    } catch (error) {
        console.error("Failed to parse or export JWKS:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
