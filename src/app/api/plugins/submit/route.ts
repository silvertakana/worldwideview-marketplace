import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
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
    const format = wwvBlock.format;
    const longDescription = pkgData.description || "No description provided.";

    if (!id || !icon || !category || !format) {
      return NextResponse.json({
        error: "Invalid 'worldwideview' block. Must contain id, icon, category, and format."
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

    return NextResponse.json({ success: true, plugin });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Plugin ID or NPM Package is already registered." }, { status: 400 });
    }
    console.error("[Submit Plugin] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
