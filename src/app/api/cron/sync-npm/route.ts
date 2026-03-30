import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchPackageMeta } from "@/data/npmRegistry";

export async function GET(request: Request) {
  // In a real production setup, we would verify an Authorization header
  // matching a CRON_SECRET here, as per Next.js Vercel Cron docs.
  // For now, this is kept open but could be easily secured:
  // const authHeader = request.headers.get("authorization");
  // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const dbPlugins = await prisma.plugin.findMany();
    const npmPackages = dbPlugins.map((p) => p.npmPackage);

    const updated = [];
    const failed = [];

    // Process sequentially to be gentle on the npm API
    for (const pkg of npmPackages) {
      const meta = await fetchPackageMeta(pkg);
      if (!meta) {
        failed.push(pkg);
        continue;
      }

      await prisma.npmCache.upsert({
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
          crawledAt: new Date(),
        },
      });
      updated.push(pkg);
    }

    return NextResponse.json({
      success: true,
      processedCount: updated.length,
      failedCount: failed.length,
      updated,
      failed,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
