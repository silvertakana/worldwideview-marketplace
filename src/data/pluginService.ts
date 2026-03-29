import type { PluginCard, PluginDetail } from "./types";
import { fetchAllPackageMeta, fetchPackageMeta } from "./npmRegistry";
import { prisma } from "@/lib/prisma";
import type { Plugin } from "@prisma/client";

/**
 * Build PluginCard objects by merging database metadata with live npm data.
 * Falls back to sensible defaults when npm is unreachable.
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
  const metaMap = await fetchAllPackageMeta(npmPackages);

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

  const npm = await fetchPackageMeta(dbPlugin.npmPackage);
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

/* ---------- merge helpers ---------- */

function mergeToCard(
  dbPlugin: Plugin,
  npm: Awaited<ReturnType<typeof fetchPackageMeta>>,
): PluginCard {
  return {
    id: dbPlugin.id,
    name: dbPlugin.name || (npm?.name?.replace("@worldwideview/wwv-plugin-", "")
      ? formatName(npm.name)
      : dbPlugin.id),
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
  npm: Awaited<ReturnType<typeof fetchPackageMeta>>,
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
