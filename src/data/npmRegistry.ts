import type { NpmPackageMeta } from "./types";

const NPM_REGISTRY = "https://registry.npmjs.org";

/** How long Next.js should cache npm responses (seconds). */
const REVALIDATE_SECONDS = 300; // 5 minutes

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
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const json: any = await res.json();
    const latestTag = json["dist-tags"]?.latest;
    const latestVersion = latestTag
      ? json.versions?.[latestTag]
      : undefined;

    return {
      name: json.name ?? npmPackage,
      description: json.description ?? "",
      version: latestTag ?? "0.0.0",
      author: extractAuthor(latestVersion ?? json),
      keywords: json.keywords ?? [],
      updatedAt: extractUpdatedAt(json, latestTag),
      repository: extractRepoUrl(json),
      readme: json.readme ?? undefined,
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

function extractAuthor(obj: any): string {
  if (typeof obj?.author === "string") return obj.author;
  if (typeof obj?.author?.name === "string") return obj.author.name;
  return "WorldWideView";
}

function extractUpdatedAt(json: any, latestTag?: string): string {
  if (latestTag && json.time?.[latestTag]) {
    return json.time[latestTag].slice(0, 10); // "YYYY-MM-DD"
  }
  if (json.time?.modified) {
    return json.time.modified.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function extractRepoUrl(json: any): string | undefined {
  const url = json.repository?.url;
  if (!url) return undefined;
  return url.replace(/^git\+/, "").replace(/\.git$/, "");
}
