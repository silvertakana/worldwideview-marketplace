import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NpmPackageMeta } from "@/data/types";
import { fetchAllPackageMeta } from "@/data/npmRegistry";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch raw search results from NPM
    const searchUrl = "https://registry.npmjs.org/-/v1/search?text=wwv-plugin-&size=100";
    const searchRes = await fetch(searchUrl, { cache: "no-store" });
    if (!searchRes.ok) {
      throw new Error(`NPM Search failed with status: ${searchRes.status}`);
    }

    const json = await searchRes.json();
    const objects = json.objects || [];

    // 2. Filter raw NPM packages with exact regex prefix matching
    const matchingNames: string[] = [];
    const prefixRegex = /^(@[\w-]+\/)?wwv-plugin-/;
    
    for (const obj of objects) {
      if (obj.package && obj.package.name && prefixRegex.test(obj.package.name)) {
        matchingNames.push(obj.package.name);
      }
    }

    // 3. Get currently tracked packages
    const dbPlugins = await prisma.plugin.findMany();
    const trackedNames = new Set(dbPlugins.map((p) => p.npmPackage));

    // 4. Identify packages that are completely unmapped
    const unmappedNames = matchingNames.filter((name) => !trackedNames.has(name));

    // 5. Hydrate the unmapped packages with detailed metadata
    const metaMap = await fetchAllPackageMeta(unmappedNames);
    const discovered: NpmPackageMeta[] = [];

    for (const name of unmappedNames) {
      const meta = metaMap.get(name);
      if (meta) {
        discovered.push(meta);
      } else {
        // Fallback for packages that strictly exist in NPM search but fail direct meta pull
        const rawObj = objects.find((o: any) => o.package.name === name)?.package;
        if (rawObj) {
           discovered.push({
             name: rawObj.name,
             description: rawObj.description || "",
             version: rawObj.version || "0.0.0",
             author: rawObj.publisher?.username || rawObj.publisher?.email || "Unknown",
             keywords: rawObj.keywords || [],
             updatedAt: rawObj.date || new Date().toISOString(),
             repository: rawObj.links?.repository,
           });
        }
      }
    }

    return NextResponse.json({ discovered });
  } catch (err: any) {
    console.error("NPM Discovery Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
