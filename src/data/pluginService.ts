import type { PluginCard, PluginDetail } from "./types";
import { KNOWN_PLUGINS } from "./knownPlugins";
import { fetchAllPackageMeta, fetchPackageMeta } from "./npmRegistry";

/**
 * Build PluginCard objects by merging curated metadata with live npm data.
 * Falls back to sensible defaults when npm is unreachable.
 */
export async function getAllPlugins(
  category?: string,
): Promise<PluginCard[]> {
  const npmPackages = KNOWN_PLUGINS.map((p) => p.npmPackage);
  const metaMap = await fetchAllPackageMeta(npmPackages);

  let cards = KNOWN_PLUGINS.map((known) => {
    const npm = metaMap.get(known.npmPackage);
    return mergeToCard(known, npm ?? null);
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

  const npm = await fetchPackageMeta(known.npmPackage);
  return mergeToDetail(known, npm);
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
): PluginCard {
  return {
    id: known.id,
    name: npm?.name?.replace("@worldwideview/wwv-plugin-", "")
      ? formatName(npm.name, npm.description)
      : known.id,
    description: npm?.description ?? known.longDescription.slice(0, 80),
    category: known.category,
    icon: known.icon,
    installs: 0, // No real install count from npm
    author: npm?.author ?? "WorldWideView",
    version: npm?.version ?? "0.0.0",
    format: known.format,
    trust: known.trust,
    tags: npm?.keywords ?? [],
    updatedAt: npm?.updatedAt ?? "—",
  };
}

function mergeToDetail(
  known: (typeof KNOWN_PLUGINS)[number],
  npm: Awaited<ReturnType<typeof fetchPackageMeta>>,
): PluginDetail {
  return {
    ...mergeToCard(known, npm),
    longDescription: known.longDescription,
    capabilities: known.capabilities,
    compatibility: ">=0.1.0",
    repository: npm?.repository,
    changelog: known.changelog,
    readme: npm?.readme,
  };
}

/** Derive a human-readable name from the npm package metadata. */
function formatName(npmName: string, description?: string): string {
  // Use the description as display name if it's short enough,
  // otherwise clean the package name.
  if (description && description.length < 80) {
    return description;
  }
  return npmName
    .replace("@worldwideview/wwv-plugin-", "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
