import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** Validate admin password from Authorization header. */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) return false;
  return token === adminPw;
}

/** GET /api/admin/registry — list all plugins. */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plugins = await prisma.plugin.findMany({
    orderBy: { addedAt: "asc" },
  });
  return NextResponse.json({ plugins });
}

/** POST /api/admin/registry — add/verify plugin(s).
 *  Single: { id }
 *  Bulk:   { plugins: [{ id }] }
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Normalize to array of NPM package names based on the input
  const items: { id: string }[] = body.plugins
    ? body.plugins
    : body.id ? [{ id: body.id }] : [];

  if (items.length === 0 || items.some((p) => !p.id || typeof p.id !== "string")) {
    return NextResponse.json({ error: "Missing or invalid plugin id(s)" }, { status: 400 });
  }

  const results = [];
  const errors = [];

  for (const item of items) {
    const npmPackage = item.id;
    try {
      const encoded = npmPackage.replace("/", "%2F");
      const npmRes = await fetch(`https://registry.npmjs.org/${encoded}/latest`);
      
      if (!npmRes.ok) {
        errors.push({ package: npmPackage, error: "Not found on NPM" });
        continue;
      }
      
      const pkgData = await npmRes.json();
      const wwvBlock = pkgData.worldwideview;
      
      if (!wwvBlock || typeof wwvBlock !== "object") {
        errors.push({ package: npmPackage, error: "Missing worldwideview manifest block" });
        continue;
      }
      
      const id = wwvBlock.id;
      const icon = wwvBlock.icon;
      const category = wwvBlock.category;
      const format = wwvBlock.format;
      const longDescription = pkgData.description || "No description provided.";
      
      if (!id || !icon || !category || !format) {
        errors.push({ package: npmPackage, error: "Invalid worldwideview block" });
        continue;
      }
      
      const capabilities = format === "bundle" ? ["data:own", "network:fetch"] : ["data:own"];

      const plugin = await prisma.plugin.upsert({
        where: { npmPackage },
        create: {
          id,
          npmPackage,
          icon,
          category,
          format,
          capabilities: JSON.stringify(capabilities),
          longDescription,
          trust: "verified", // Admin explicitly added this, so verified
        },
        update: {
          icon,
          category,
          format,
          capabilities: JSON.stringify(capabilities),
          longDescription,
          trust: "verified",
        }
      });
      
      results.push(plugin);
    } catch (err: any) {
      errors.push({ package: npmPackage, error: err.message });
    }
  }

  return NextResponse.json({ plugins: results, errors }, { status: 201 });
}

/** PATCH /api/admin/registry — update trust level for plugin(s).
 *  Payload: { ids: string[], trust: string }
 */
export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const ids: string[] = body.ids || [];
  const trust: string = body.trust;

  if (ids.length === 0 || typeof trust !== "string") {
    return NextResponse.json({ error: "Missing ids or trust level" }, { status: 400 });
  }

  const result = await prisma.plugin.updateMany({
    where: { id: { in: ids } },
    data: { trust },
  });

  return NextResponse.json({ updated: ids, count: result.count, trust });
}

/** DELETE /api/admin/registry — remove plugin(s).
 *  Single: { id }
 *  Bulk:   { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Normalize to array
  const ids: string[] = body.ids
    ? body.ids
    : body.id ? [body.id] : [];

  if (ids.length === 0 || ids.some((id: string) => typeof id !== "string")) {
    return NextResponse.json({ error: "Missing or invalid id(s)" }, { status: 400 });
  }

  const result = await prisma.plugin.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ removed: ids, count: result.count });
}
