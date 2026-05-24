import { NextRequest, NextResponse } from "next/server";
import { getJwksPublicKeys } from "@/lib/auth/signingKey";

export async function GET(_req: NextRequest) {
    try {
        const keys = await getJwksPublicKeys();
        return NextResponse.json({ keys }, {
            status: 200,
            headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
        });
    } catch (error) {
        console.error("JWKS endpoint failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
