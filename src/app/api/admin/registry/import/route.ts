import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Plugin } from "@prisma/client";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) return false;
  // Length difference is not a secret; early-exit is fine.
  if (token.length !== adminPw.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(adminPw));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const mode: "overwrite" | "merge" = body.mode;
    const plugins: Plugin[] = body.plugins;

    if (!Array.isArray(plugins) || (mode !== "overwrite" && mode !== "merge")) {
      return NextResponse.json({ error: "Invalid payload format." }, { status: 400 });
    }

    if (mode === "overwrite") {
      await prisma.$transaction([
        prisma.plugin.deleteMany({}),
        prisma.plugin.createMany({ data: plugins }),
      ]);
    } else if (mode === "merge") {
      await prisma.$transaction(
        plugins.map((plugin) =>
          prisma.plugin.upsert({
            where: { id: plugin.id },
            update: plugin,
            create: plugin,
          })
        )
      );
    }

    return NextResponse.json({ success: true, count: plugins.length, mode });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "An internal error occurred." },
      { status: 500 }
    );
  }
}
