import { NextRequest, NextResponse } from "next/server";
import { rotateKey } from "@/lib/auth/signingKey";

export async function POST(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization");
        if (auth !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
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
