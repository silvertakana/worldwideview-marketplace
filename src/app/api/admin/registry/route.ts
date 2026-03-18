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

/** POST /api/admin/registry — add a plugin { id, name? }. */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name } = await request.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const plugin = await prisma.verifiedPlugin.upsert({
    where: { id },
    update: { name: name ?? null },
    create: { id, name: name ?? null },
  });

  return NextResponse.json({ plugin }, { status: 201 });
}

/** DELETE /api/admin/registry — remove a plugin { id }. */
export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await prisma.verifiedPlugin.delete({ where: { id } });
    return NextResponse.json({ removed: id });
  } catch {
    return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
  }
}
