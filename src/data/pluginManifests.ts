import type { PluginDetail } from "./types";

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
    icon: "Swords",
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
  "nuclear-facilities": {
    id: "nuclear-facilities",
    name: "Nuclear Facilities — Global",
    version: "1.0.0",
    description: "Worldwide nuclear power plants, reactors, and decommissioned facilities from OSM",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "Custom",
    icon: "Atom",
    dataFile: "/data/nuclear_facilities.geojson",
    rendering: {
      entityType: "point",
      color: "#22d3ee",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: 50,
      maxEntities: 1000,
    },
  },
  "embassies": {
    id: "embassies",
    name: "Embassies & Consulates",
    version: "1.0.0",
    description: "Global embassies, consulates, and diplomatic missions from OpenStreetMap",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "Custom",
    icon: "Landmark",
    dataFile: "/data/embassies.geojson",
    rendering: {
      entityType: "point",
      color: "#a855f7",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: 50,
      maxEntities: 5000,
    },
  },
};

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

  // Bundle plugins require an entry field to pass validateManifest.
  // For built-in bundles the plugin code is already in WWV, so we use
  // the plugin ID as a stable placeholder.
  if (detail.format === "bundle") {
    base.entry = detail.id;
  }

  return base;
}

