import type { PluginDetail } from "./types";

/**
 * Manifest templates for marketplace-only plugins (not built-in).
 * Sent to the bridge during install so the loader can re-register them.
 * Built-in plugins (aviation, maritime, etc.) don't need manifests here
 * because they're hard-coded in AppShell.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ManifestTemplate = Record<string, any>;

export const PLUGIN_MANIFESTS: Record<string, ManifestTemplate> = {};

/** Get the install manifest for a plugin, or a minimal fallback. */
export function getInstallManifest(detail: PluginDetail): ManifestTemplate {
  if (PLUGIN_MANIFESTS[detail.id]) return PLUGIN_MANIFESTS[detail.id];

  const base: ManifestTemplate = {
    id: detail.id,
    name: detail.name,
    version: detail.version,
    type: "data-layer",
    format: detail.format,
    trust: detail.trust,
    capabilities: detail.capabilities,
    category: detail.category,
    icon: detail.icon,
  };

  // Requesting the +esm endpoint from jsdelivr guarantees they parse the package.json "module" field
  // and return the correct module bundle, regardless of whether Vite chose /dist/frontend.mjs
  // or tsup chose /dist/index.mjs.
  if (detail.format === "bundle") {
    base.entry = `https://cdn.jsdelivr.net/npm/${detail.npmPackage}@${detail.version}/+esm`;
  }

  // Static plugins require a dataFile pointing to their GeoJSON point data.
  // We point this to the CDN as well.
  if (detail.format === "static" && base.dataFile?.startsWith("/data/")) {
    const geojsonName = base.dataFile.split("/data/")[1];
    base.dataFile = `https://cdn.jsdelivr.net/npm/${detail.npmPackage}@${detail.version}/data/${geojsonName}`;
  }

  return base;
}

