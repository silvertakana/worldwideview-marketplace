import type { PluginDetail } from "./pluginDetails";

/**
 * Manifest templates for marketplace-only plugins (not built-in).
 * Sent to the bridge during install so the loader can re-register them.
 * Built-in plugins (aviation, maritime, etc.) don't need manifests here
 * because they're hard-coded in AppShell.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ManifestTemplate = Record<string, any>;

export const PLUGIN_MANIFESTS: Record<string, ManifestTemplate> = {
  "military-bases": {
    id: "military-bases",
    name: "Military Bases — Global",
    version: "1.0.0",
    description: "Worldwide military bases, airfields, and barracks from OSM",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "Custom",
    icon: "🏛️",
    dataFile: "/data/military_bases.geojson",
    rendering: {
      entityType: "point",
      color: "#ef4444",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: 50,
      maxEntities: 5000,
    },
  },
};

/** Get the install manifest for a plugin, or a minimal fallback. */
export function getInstallManifest(detail: PluginDetail): ManifestTemplate {
  return PLUGIN_MANIFESTS[detail.id] ?? {
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
}
