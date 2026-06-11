import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Deletes expired OAuth authorization codes that are older than 10 minutes
 * plus a 60-second clock-skew buffer.
 *
 * OAuth codes are deleted on successful exchange, but codes that expire
 * without being exchanged accumulate. This cron periodically cleans them up.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Service Unavailable: CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Deletion threshold: expiresAt older than 60s (buffer for clock skew)
    const threshold = new Date(Date.now() - 60 * 1000);

    const result = await prisma.oAuthAuthorizationCode.deleteMany({
      where: {
        expiresAt: { lt: threshold },
      },
    });

    console.log(
      `[cron] cleanup-oauth-codes: deleted ${result.count} expired code(s)`,
    );

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("[cron] cleanup-oauth-codes failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
