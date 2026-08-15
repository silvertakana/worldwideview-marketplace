import type { NpmPackageMeta } from "./types";

const NPM_REGISTRY = "https://registry.npmjs.org";

/** Author field of an npm manifest: plain string or { name }. */
type NpmAuthor = string | { name?: string };

/** Minimal shape of a single version entry in an npm packument. */
interface NpmRegistryVersion {
  author?: NpmAuthor;
}

/** Minimal shape of the npm packument fields we consume. */
interface NpmRegistryManifest {
  name?: string;
  description?: string;
  readme?: string;
  keywords?: string[];
  author?: NpmAuthor;
  repository?: { url?: string };
  "dist-tags"?: { latest?: string };
  versions?: Record<string, NpmRegistryVersion>;
  time?: Record<string, string>;
}

/**
 * Fetch metadata for a single @worldwideview package from the npm registry.
 * Returns null if the request fails (package doesn't exist, network error, etc.).
 */
export async function fetchPackageMeta(
  npmPackage: string,
): Promise<NpmPackageMeta | null> {
  const encoded = npmPackage.replace("/", "%2F");
  const url = `${NPM_REGISTRY}/${encoded}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = (await res.json()) as NpmRegistryManifest;
    const latestTag = json["dist-tags"]?.latest;
    const latestVersion = latestTag
      ? json.versions?.[latestTag]
      : undefined;

    const readme = json.readme ?? undefined;
    return {
      name: json.name ?? npmPackage,
      description: json.description ?? "",
      version: latestTag ?? "0.0.0",
      author: extractAuthor(latestVersion ?? json),
      keywords: json.keywords ?? [],
      updatedAt: extractUpdatedAt(json, latestTag),
      repository: extractRepoUrl(json),
      readme,
      changelog: extractChangelog(readme),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch metadata for multiple packages in parallel.
 * Returns a Map keyed by npm package name.
 */
export async function fetchAllPackageMeta(
  packages: string[],
): Promise<Map<string, NpmPackageMeta>> {
  const results = await Promise.allSettled(
    packages.map((pkg) => fetchPackageMeta(pkg)),
  );

  const map = new Map<string, NpmPackageMeta>();
  results.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      map.set(packages[i], result.value);
    }
  });
  return map;
}

/* ---------- helpers ---------- */

function extractAuthor(obj: NpmRegistryVersion | NpmRegistryManifest): string {
  if (typeof obj?.author === "string") return obj.author;
  if (typeof obj?.author?.name === "string") return obj.author.name;
  return "WorldWideView";
}

function extractUpdatedAt(json: NpmRegistryManifest, latestTag?: string): string {
  if (latestTag && json.time?.[latestTag]) {
    return json.time[latestTag].slice(0, 10); // "YYYY-MM-DD"
  }
  if (json.time?.modified) {
    return json.time.modified.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function extractRepoUrl(json: NpmRegistryManifest): string | undefined {
  const url = json.repository?.url;
  if (!url) return undefined;
  return url.replace(/^git\+/, "").replace(/\.git$/, "");
}

/**
 * Extract the ## Changelog section from the package README.
 * Returns undefined if no changelog section is found.
 */
function extractChangelog(readme?: string): string | undefined {
  if (!readme) return undefined;
  const match = readme.match(/## Changelog\s*\n([\s\S]*?)(?=\n## |$)/);
  if (!match?.[1]) return undefined;
  return match[1].trim();
}
