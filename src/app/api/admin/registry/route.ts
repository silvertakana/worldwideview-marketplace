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

/** GET /api/admin/registry — list all verified plugins. */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plugins = await prisma.verifiedPlugin.findMany({
    orderBy: { addedAt: "asc" },
  });
  return NextResponse.json({ plugins });
}

/** POST /api/admin/registry — add plugin(s).
 *  Single: { id, name? }
 *  Bulk:   { plugins: [{ id, name? }] }
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Normalize to array
  const items: { id: string; name?: string | null }[] = body.plugins
    ? body.plugins
    : body.id ? [{ id: body.id, name: body.name }] : [];

  if (items.length === 0 || items.some((p) => !p.id || typeof p.id !== "string")) {
    return NextResponse.json({ error: "Missing or invalid plugin id(s)" }, { status: 400 });
  }

  const results = await prisma.$transaction(
    items.map((p) =>
      prisma.verifiedPlugin.upsert({
        where: { id: p.id },
        update: { name: p.name ?? null },
        create: { id: p.id, name: p.name ?? null },
      })
    )
  );

  return NextResponse.json({ plugins: results }, { status: 201 });
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

  const result = await prisma.verifiedPlugin.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ removed: ids, count: result.count });
}
