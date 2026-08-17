import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseUser } from "@/lib/auth/requireSession";
import { getOrCreateMarketplaceUser } from "@/lib/auth/getOrCreateMarketplaceUser";
import { firePluginSubmitWebhook } from "@/lib/webhooks";
import { pluginSubmitLimiter, getClientIp } from "@/lib/rateLimiters";

export async function POST(req: Request) {
  const limiter = pluginSubmitLimiter.check(getClientIp(req));
  if (limiter) return limiter;

  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await getOrCreateMarketplaceUser(supabaseUser);

  try {
    const data = await req.json();
    const { npmPackage } = data;

    if (!npmPackage) {
      return NextResponse.json({ error: "NPM Package name is required" }, { status: 400 });
    }

    // Fetch from NPM
    const encoded = npmPackage.replace("/", "%2F");
    const npmRes = await fetch(`https://registry.npmjs.org/${encoded}/latest`);

    if (!npmRes.ok) {
      return NextResponse.json({ error: "Could not find package on NPM registry. Make sure it is public." }, { status: 400 });
    }

    const pkgData = await npmRes.json();
    const wwvBlock = pkgData.worldwideview;

    if (!wwvBlock || typeof wwvBlock !== 'object') {
      return NextResponse.json({
        error: "Plugin manifest missing. Please add a 'worldwideview' object block to your package.json."
      }, { status: 400 });
    }

    const id = wwvBlock.id;
    const icon = wwvBlock.icon;
    const category = wwvBlock.category;
    const format = wwvBlock.format || "bundle";
    const longDescription = pkgData.description || "No description provided.";

    if (!id || !icon || !category) {
      return NextResponse.json({
        error: "Invalid 'worldwideview' block. Must contain id, icon, and category."
      }, { status: 400 });
    }

    const capabilities = format === "bundle" ? ["data:own", "network:fetch"] : ["data:own"];

    const plugin = await prisma.plugin.create({
      data: {
        id,
        npmPackage,
        icon,
        category,
        format,
        capabilities: JSON.stringify(capabilities),
        longDescription,
        trust: "pending",
      },
    });

    void firePluginSubmitWebhook({
      event: "plugin.submitted",
      timestamp: new Date().toISOString(),
      plugin: {
        id: plugin.id,
        name: pkgData.name ?? npmPackage,
        npmPackage,
        version: pkgData.version ?? "unknown",
        description: plugin.longDescription,
        category: plugin.category,
        icon: plugin.icon,
      },
      submittedBy: {
        email: supabaseUser.email ?? null,
        name: (supabaseUser.user_metadata?.full_name as string | undefined) ?? null,
      },
      adminUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "") + "/admin",
    });

    return NextResponse.json({ success: true, plugin });
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Plugin ID or NPM Package is already registered." }, { status: 400 });
    }
    console.error("[Submit Plugin] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
