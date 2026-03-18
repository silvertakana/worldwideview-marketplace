import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signRegistry } from "@/lib/registryKeys";

/**
 * GET /api/registry
 * Returns a signed JSON payload listing all verified plugin IDs.
 * Reads from the SQLite database. Public endpoint — no auth required.
 */
export async function GET() {
  try {
    const plugins = await prisma.verifiedPlugin.findMany({
      select: { id: true },
      orderBy: { addedAt: "asc" },
    });

    const payload = {
      plugins: plugins.map((p) => p.id),
      issuedAt: new Date().toISOString(),
    };

    const data = JSON.stringify(payload);
    const signature = signRegistry(data);

    return NextResponse.json({ ...payload, signature });
  } catch (err) {
    console.error("[Registry] Error:", err);
    return NextResponse.json(
      { error: "Registry query failed" },
      { status: 500 },
    );
  }
}
