import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/auth/apiKeyHash";
import { resolveTicketAccess } from "@/lib/auth/tierScope";
import { resolveAudience } from "@/lib/auth/ticketAudience";
import { getActiveKey } from "@/lib/auth/signingKey";
import { exchangeLimiter, getClientIp } from "@/lib/rateLimiters";

export async function POST(req: NextRequest) {
    const limiter = exchangeLimiter.check(getClientIp(req));
    if (limiter) return limiter;

    try {
        const body = await req.json();
        const { apiKey, audience } = body;

        if (!apiKey) {
            return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
        }

        // The caller names the engine the ticket is for, so the value is checked
        // for shape rather than against an allowlist (other engines exist).
        const resolvedAudience = resolveAudience(audience);
        if (resolvedAudience === null) {
            return NextResponse.json({ error: "Unsupported audience" }, { status: 400 });
        }

        const keyHash = hashApiKey(apiKey);

        // Per-key limiter — prevents a single leaked/stolen API key from
        // hammering the exchange endpoint (composite key, shared limiter).
        if (keyHash) {
            const keyLimiter = exchangeLimiter.check(`key:${keyHash}`);
            if (keyLimiter) return keyLimiter;
        }

        const apiKeyRecord = await prisma.marketplaceApiKey.findUnique({
            where: { keyHash },
            include: { user: true },
        });

        if (!apiKeyRecord || apiKeyRecord.revokedAt !== null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fire-and-forget analytics update — never block the response
        prisma.marketplaceApiKey.update({
            where: { id: apiKeyRecord.id },
            data: { lastUsedAt: new Date() },
        }).catch((err: Error) => console.warn("lastUsedAt update failed:", err.message));

        const { kid, privateKey } = await getActiveKey();
        const now = Math.floor(Date.now() / 1000);

        // Tier and scope come from the key that presented itself. A key with
        // neither keeps the historical free/read-only ticket, so a marketplace
        // that has not been given a scope behaves exactly as before.
        const { tier, scope } = resolveTicketAccess(apiKeyRecord);

        const jwt = await new jose.SignJWT({ tier, scope })
            .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid })
            .setIssuer(process.env.JWT_ISSUER ?? "https://marketplace.worldwideview.dev")
            .setSubject(apiKeyRecord.userId)
            .setAudience(resolvedAudience)
            .setExpirationTime(now + 300)
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
