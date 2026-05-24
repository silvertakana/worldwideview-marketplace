import { NextRequest, NextResponse } from "next/server";
import { revokeExpiredRetiredKeys } from "@/lib/auth/signingKey";

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "Service Unavailable: CRON_SECRET not configured" }, { status: 503 });
    }
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const revokedKids = await revokeExpiredRetiredKeys();
        return NextResponse.json({
            success: true,
            revokedCount: revokedKids.length,
            revokedKids,
        });
    } catch (error) {
        console.error("Key revocation cron failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
