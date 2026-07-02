import { NextResponse } from "next/server";
import * as jose from "jose";
import { prisma } from "@/lib/prisma";
import { issueApiKey } from "@/lib/auth/apiKeyIssuance";

export async function POST(request: Request) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "missing_token" }, { status: 401 });
    }

    const token = authHeader.slice(7);

    const secret = process.env.MARKETPLACE_CONNECT_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    let payload: { sub?: string };
    try {
        const encodedSecret = new TextEncoder().encode(secret);
        const result = await jose.jwtVerify(token, encodedSecret, {
            algorithms: ["HS256"],
            clockTolerance: 5,
        });
        payload = result.payload as { sub?: string };
    } catch (err) {
        if (err instanceof jose.errors.JWTExpired) {
            return NextResponse.json({ error: "token_expired" }, { status: 401 });
        }
        return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    const supabaseUuid = payload.sub;
    if (!supabaseUuid) {
        return NextResponse.json({ error: "missing_subject" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { supabaseUserId: supabaseUuid },
    });

    if (!user) {
        return NextResponse.json(
            { error: "user_not_found", hint: "User must exist in marketplace before auto-linking" },
            { status: 404 },
        );
    }

    const { apiKey } = await issueApiKey({ userId: user.id, name: "Cloud Auto-Link" });

    return NextResponse.json({ apiKey });
}
