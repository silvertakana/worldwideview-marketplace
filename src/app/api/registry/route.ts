import { NextResponse } from "next/server";
import { VERIFIED_PLUGIN_IDS } from "@/data/verifiedPlugins";
import { signRegistry } from "@/lib/registryKeys";

/**
 * GET /api/registry
 * Returns a signed JSON payload listing all verified plugin IDs.
 * Public endpoint — no auth required.
 */
export async function GET() {
  try {
    const payload = {
      plugins: VERIFIED_PLUGIN_IDS,
      issuedAt: new Date().toISOString(),
    };

    const data = JSON.stringify(payload);
    const signature = signRegistry(data);

    return NextResponse.json({ ...payload, signature });
  } catch (err) {
    console.error("[Registry] Signing error:", err);
    return NextResponse.json(
      { error: "Registry signing failed" },
      { status: 500 },
    );
  }
}
