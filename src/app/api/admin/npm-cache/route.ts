import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchPackageMeta } from "@/data/npmRegistry";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) return false;
  return token === adminPw;
}

// Ensure the cache is updated if it hasn't been crawled in the last hour
const CACHE_LIFESPAN_MS = 1000 * 60 * 60; // 1 hour

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pkg = request.nextUrl.searchParams.get("pkg");
  if (!pkg) return NextResponse.json({ error: "Missing pkg" }, { status: 400 });

  let cacheRecord = await prisma.npmCache.findUnique({
    where: { npmPackage: pkg },
  });

  const now = new Date();
  const isStale = !cacheRecord || (now.getTime() - new Date(cacheRecord.crawledAt).getTime() > CACHE_LIFESPAN_MS);

  if (isStale) {
    const meta = await fetchPackageMeta(pkg);
    if (meta) {
      cacheRecord = await prisma.npmCache.upsert({
        where: { npmPackage: pkg },
        create: {
          npmPackage: pkg,
          name: meta.name,
          description: meta.description,
          version: meta.version,
          author: meta.author,
          keywords: JSON.stringify(meta.keywords),
          repository: meta.repository,
          readme: meta.readme,
          changelog: meta.changelog,
          updatedAt: meta.updatedAt,
        },
        update: {
          name: meta.name,
          description: meta.description,
          version: meta.version,
          author: meta.author,
          keywords: JSON.stringify(meta.keywords),
          repository: meta.repository,
          readme: meta.readme,
          changelog: meta.changelog,
          updatedAt: meta.updatedAt,
          crawledAt: now,
        },
      });
    }
  }

  if (!cacheRecord) {
    return NextResponse.json({ error: "Package not found on NPM or Cache" }, { status: 404 });
  }

  return NextResponse.json({
    ...cacheRecord,
    keywords: JSON.parse(cacheRecord.keywords || "[]"),
  });
}
