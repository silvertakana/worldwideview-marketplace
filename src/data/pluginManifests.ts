import type { PluginDetail } from "./types";

/**
 * Manifest templates for marketplace-only plugins (not built-in).
 * Sent to the bridge during install so the loader can re-register them.
 * Built-in plugins (aviation, maritime, etc.) don't need manifests here
 * because they're hard-coded in AppShell.
 */

/** Minimal WWV manifest shape sent to the bridge during install. */
interface ManifestTemplate {
  id: string;
  name: string;
  version: string;
  type: "data-layer";
  format: string;
  trust: string;
  capabilities: string[];
  category: string;
  icon: string;
  entry?: string;
  dataFile?: string;
}

export const PLUGIN_MANIFESTS: Record<string, ManifestTemplate> = {};

/**
 * WWV's validateManifest only accepts these trust values:
 *   built-in | verified | unverified
 * The marketplace DB may hold legacy / internal labels (e.g. "COMMUNITY",
 * "pending"). Map anything we don't explicitly trust to "unverified" so the
 * manifest passes WWV validation. Community / unreviewed plugins are
 * unverified by definition.
 */
function normalizeTrust(trust: string | undefined): string {
  switch ((trust ?? "").toLowerCase()) {
    case "built-in":
      return "built-in";
    case "verified":
      return "verified";
    case "unverified":
    case "community":
    case "pending":
    default:
      return "unverified";
  }
}

/**
 * WWV's manifest format vocabulary is "bundle" | "static" | "declarative".
 * The marketplace DB may hold internal labels (e.g. "ALL_BUNDLE"). Map any
 * bundle-flavoured value to "bundle" so the entry-URL logic below runs.
 */
function normalizeFormat(format: string | undefined): string {
  switch ((format ?? "").toLowerCase()) {
    case "static":
      return "static";
    case "declarative":
      return "declarative";
    case "bundle":
    case "all_bundle":
    default:
      return "bundle";
  }
}

/** Get the install manifest for a plugin, or a minimal fallback. */
export function getInstallManifest(detail: PluginDetail): ManifestTemplate {
  if (PLUGIN_MANIFESTS[detail.id]) return PLUGIN_MANIFESTS[detail.id];

  const base: ManifestTemplate = {
    id: detail.id,
    name: detail.name,
    version: detail.version,
    type: "data-layer",
    format: normalizeFormat(detail.format),
    trust: normalizeTrust(detail.trust),
    capabilities: detail.capabilities,
    category: detail.category,
    icon: detail.icon,
  };

  // WWV requires a non-empty capabilities array. Community plugins seeded with
  // an empty list would otherwise fail validation, so fall back to the minimal
  // self-data capability.
  if (!Array.isArray(base.capabilities) || base.capabilities.length === 0) {
    base.capabilities = ["data:own"];
  }

  // Fix faulty plugins that say "static" on NPM but are actually bundles missing dataFile config
  if (base.format === "static" && !base.dataFile) {
    base.format = "bundle";
  }

  // Requesting the +esm endpoint from jsdelivr guarantees they parse the package.json "module" field
  // and return the correct module bundle, regardless of whether Vite chose /dist/frontend.mjs
  // or tsup chose /dist/index.mjs.
  if (base.format === "bundle") {
    base.entry = `https://cdn.jsdelivr.net/npm/${detail.npmPackage}@${detail.version}/+esm`;
  }

  // Static plugins require a dataFile pointing to their GeoJSON point data.
  // We point this to the CDN as well.
  if (base.format === "static" && base.dataFile?.startsWith("/data/")) {
    const geojsonName = base.dataFile.split("/data/")[1];
    base.dataFile = `https://cdn.jsdelivr.net/npm/${detail.npmPackage}@${detail.version}/data/${geojsonName}`;
  }

  return base;
}

