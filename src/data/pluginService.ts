import type { PluginCard, PluginDetail } from "./types";
import { KNOWN_PLUGINS } from "./knownPlugins";
import { fetchAllPackageMeta, fetchPackageMeta } from "./npmRegistry";
import { prisma } from "@/lib/prisma";

/** Hardcoded built-in IDs that are always trusted regardless of registry. */
const BUILT_IN_IDS = new Set(
  KNOWN_PLUGINS.filter((p) => p.trust === "built-in").map((p) => p.id),
);

/** Get the set of verified plugin IDs from the live registry DB. */
async function getVerifiedIds(): Promise<Set<string>> {
  const rows = await prisma.verifiedPlugin.findMany({ select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

/** Resolve trust from the live registry instead of static data. */
function resolveTrust(
  pluginId: string,
  verifiedIds: Set<string>,
): "built-in" | "verified" | "unverified" {
  if (BUILT_IN_IDS.has(pluginId)) return "built-in";
  return verifiedIds.has(pluginId) ? "verified" : "unverified";
}

/**
 * Build PluginCard objects by merging curated metadata with live npm data.
 * Falls back to sensible defaults when npm is unreachable.
 */
export async function getAllPlugins(
  category?: string,
): Promise<PluginCard[]> {
  const npmPackages = KNOWN_PLUGINS.map((p) => p.npmPackage);
  const [metaMap, verifiedIds] = await Promise.all([
    fetchAllPackageMeta(npmPackages),
    getVerifiedIds(),
  ]);

  let cards = KNOWN_PLUGINS.map((known) => {
    const npm = metaMap.get(known.npmPackage);
    return mergeToCard(known, npm ?? null, verifiedIds);
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
  const known = KNOWN_PLUGINS.find((p) => p.id === id);
  if (!known) return null;

  const [npm, verifiedIds] = await Promise.all([
    fetchPackageMeta(known.npmPackage),
    getVerifiedIds(),
  ]);
  return mergeToDetail(known, npm, verifiedIds);
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
  known: (typeof KNOWN_PLUGINS)[number],
  npm: Awaited<ReturnType<typeof fetchPackageMeta>>,
  verifiedIds: Set<string>,
): PluginCard {
  return {
    id: known.id,
    name: npm?.name?.replace("@worldwideview/wwv-plugin-", "")
      ? formatName(npm.name)
      : known.id,
    description: npm?.description ?? known.longDescription.slice(0, 80),
    category: known.category,
    icon: known.icon,
    installs: 0, // No real install count from npm
    author: npm?.author ?? "WorldWideView",
    version: npm?.version ?? "0.0.0",
    format: known.format,
    trust: resolveTrust(known.id, verifiedIds),
    tags: npm?.keywords ?? [],
    updatedAt: npm?.updatedAt ?? "—",
  };
}

function mergeToDetail(
  known: (typeof KNOWN_PLUGINS)[number],
  npm: Awaited<ReturnType<typeof fetchPackageMeta>>,
  verifiedIds: Set<string>,
): PluginDetail {
  return {
    ...mergeToCard(known, npm, verifiedIds),
    longDescription: known.longDescription,
    capabilities: known.capabilities,
    compatibility: ">=0.1.0",
    repository: npm?.repository,
    changelog: npm?.changelog ?? known.changelog,
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
