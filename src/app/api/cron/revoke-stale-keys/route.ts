import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Daily sweeper that revokes stale MarketplaceApiKey rows.
 *
 * Revokes any API key whose `origin` is null (pre-PR / loopback keys issued
 * before origin tracking existed) and whose `lastUsedAt` is older than 30 days.
 * Without this sweep those keys are effectively immortal.
 *
 * Intended schedule: daily. The repo's existing cron trigger mechanism is the
 * `scripts/cron.mjs` daemon launched by `docker-entrypoint.sh` (currently wired
 * to ping `/api/cron/sync-npm`); extend that daemon (or any external scheduler)
 * to also ping this endpoint daily with `Authorization: Bearer $CRON_SECRET`.
 *
 * Auth mirrors `src/app/api/cron/revoke-retired-keys/route.ts`: a Bearer token
 * compared in constant time against `process.env.CRON_SECRET`. The endpoint is
 * refused entirely (503) when CRON_SECRET is not configured, so it can never
 * run unauthenticated.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "Service Unavailable: CRON_SECRET not configured" }, { status: 503 });
    }
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = auth.slice("Bearer ".length);
    if (token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { count } = await prisma.marketplaceApiKey.updateMany({
            where: {
                origin: null,
                lastUsedAt: { lt: new Date(Date.now() - 30 * 86400_000) },
            },
            data: { revokedAt: new Date() },
        });
        return NextResponse.json({
            success: true,
            revoked: count,
        });
    } catch (error) {
        console.error("Stale key revocation cron failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
