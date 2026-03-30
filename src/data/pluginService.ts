import type { PluginCard, PluginDetail, NpmPackageMeta } from "./types";
import { prisma } from "@/lib/prisma";
import type { Plugin, NpmCache } from "@prisma/client";

/**
 * Build PluginCard objects by merging database metadata with local crawler cache (NpmCache).
 * Falls back to sensible defaults when cache is missing.
 */
export async function getAllPlugins(
  category?: string,
): Promise<PluginCard[]> {
  const dbPlugins = await prisma.plugin.findMany({
    where: { 
      trust: { in: ["built-in", "verified"] },
    }
  });

  const npmPackages = dbPlugins.map((p) => p.npmPackage);
  const cacheRecords = await prisma.npmCache.findMany({
    where: { npmPackage: { in: npmPackages } }
  });

  const metaMap = new Map<string, NpmPackageMeta>();
  cacheRecords.forEach((c) => {
    metaMap.set(c.npmPackage, mapCacheToMeta(c));
  });

  let cards = dbPlugins.map((dbPlugin) => {
    const npm = metaMap.get(dbPlugin.npmPackage);
    return mergeToCard(dbPlugin, npm ?? null);
  });

  if (category && category !== "All") {
    cards = cards.filter((c) => c.category === category);
  }
  return cards;
}

/** Return a single plugin's full detail by marketplace id. */
export async function getPluginById(
  id: string,
): Promise<PluginDetail | null> {
  const dbPlugin = await prisma.plugin.findUnique({ where: { id } });
  if (!dbPlugin || dbPlugin.trust === "pending") return null;

  const cacheRecord = await prisma.npmCache.findUnique({
    where: { npmPackage: dbPlugin.npmPackage }
  });

  const npm = cacheRecord ? mapCacheToMeta(cacheRecord) : null;
  return mergeToDetail(dbPlugin, npm);
}

/**
 * Search plugins by query string (matches name or description)
 * and optional category filter.
 */
export async function searchPlugins(
  query: string,
  category?: string,
): Promise<PluginCard[]> {
  const all = await getAllPlugins(category);
  const q = query.toLowerCase();

  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q)),
  );
}

/* ---------- helpers ---------- */

function mapCacheToMeta(c: NpmCache): NpmPackageMeta {
  let keywords: string[] = [];
  try {
    keywords = JSON.parse(c.keywords);
  } catch (e) {}

  return {
    name: c.name,
    description: c.description,
    version: c.version,
    author: c.author,
    keywords,
    repository: c.repository ?? undefined,
    readme: c.readme ?? undefined,
    changelog: c.changelog ?? undefined,
    updatedAt: c.updatedAt,
  };
}

function mergeToCard(
  dbPlugin: Plugin,
  npm: NpmPackageMeta | null,
): PluginCard {
  return {
    id: dbPlugin.id,
    name: npm?.name?.replace("@worldwideview/wwv-plugin-", "")
      ? formatName(npm.name)
      : dbPlugin.id,
    description: npm?.description ?? dbPlugin.longDescription.slice(0, 80),
    category: dbPlugin.category,
    icon: dbPlugin.icon,
    installs: 0, // No real install count from npm
    author: npm?.author ?? "WorldWideView",
    version: npm?.version ?? "0.0.0",
    format: dbPlugin.format as "bundle" | "static" | "declarative",
    trust: dbPlugin.trust as "built-in" | "verified" | "unverified",
    tags: npm?.keywords ?? [],
    updatedAt: npm?.updatedAt ?? "—",
  };
}

function mergeToDetail(
  dbPlugin: Plugin,
  npm: NpmPackageMeta | null,
): PluginDetail {
  let capabilities: string[] = [];
  try {
    capabilities = JSON.parse(dbPlugin.capabilities);
  } catch (e) {}

  return {
    ...mergeToCard(dbPlugin, npm),
    longDescription: dbPlugin.longDescription,
    capabilities,
    compatibility: ">=0.1.0",
    repository: npm?.repository,
    changelog: npm?.changelog ?? dbPlugin.changelog ?? "",
    readme: npm?.readme,
  };
}

/** Derive a human-readable name from the npm package name. */
function formatName(npmName: string): string {
  return npmName
    .replace("@worldwideview/wwv-plugin-", "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
