import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Status + HTTP code policy:
//   db down -> "degraded", 503
//     Rationale: the app cannot serve registry data without its SQLite store.
//     A load balancer or container orchestrator should stop routing traffic
//     and alert the operator.
//   all ok -> "ok", 200
// ---------------------------------------------------------------------------

type HealthStatus = "ok" | "degraded";

interface HealthBody {
    status: HealthStatus;
    checks: {
        db: boolean;
    };
    timestamp: string;
}

export async function GET(): Promise<NextResponse<HealthBody>> {
    let db = false;
    try {
        await prisma.$queryRaw`SELECT 1`;
        db = true;
    } catch {
        db = false;
    }

    const status: HealthStatus = db ? "ok" : "degraded";
    const httpStatus = db ? 200 : 503;

    const body: HealthBody = {
        status,
        checks: { db },
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(body, { status: httpStatus });
}
