import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/auth/apiKeyHash";
import { getEffectiveTier } from "@/lib/auth/tierGating";
import { buildTierClaims } from "@/lib/auth/tierClaims";
import { getActiveKey } from "@/lib/auth/signingKey";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apiKey, audience, plugin_id: _plugin_id } = body;

        if (!apiKey) {
            return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
        }

        const keyHash = hashApiKey(apiKey);
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

        const effectiveTier = getEffectiveTier(apiKeyRecord.user);
        const claims = buildTierClaims(apiKeyRecord.user);

        const jwt = await new jose.SignJWT({
            tier: effectiveTier,
            subscriptionStatus: claims.subscriptionStatus,
        })
            .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid })
            .setIssuer("https://marketplace.worldwideview.dev")
            .setSubject(apiKeyRecord.userId)
            .setAudience(audience ?? "wwv-data-engine")
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
