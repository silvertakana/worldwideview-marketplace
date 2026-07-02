import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { rotateKey } from "@/lib/auth/signingKey";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/auth/apiKeyHash";

export async function POST(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = auth.slice("Bearer ".length);

    const secret = process.env.CRON_SECRET;
    if (secret) {
        if (token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    } else {
        const keyHash = hashApiKey(token);
        const apiKeyRecord = await prisma.marketplaceApiKey.findUnique({
            where: { keyHash },
        });
        if (!apiKeyRecord || apiKeyRecord.revokedAt !== null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        prisma.marketplaceApiKey.update({
            where: { id: apiKeyRecord.id },
            data: { lastUsedAt: new Date() },
        }).catch((err: Error) => console.warn("lastUsedAt update failed:", err.message));
    }

    try {
        const result = await rotateKey();
        return NextResponse.json({
            success: true,
            oldKid: result.oldKid,
            newKid: result.newKid,
            message: `Old key retiring for 10 min overlap window, then revoked by cron.`,
        });
    } catch (error) {
        console.error("Key rotation failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
