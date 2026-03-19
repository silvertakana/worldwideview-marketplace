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
  "volcanoes": {
    id: "volcanoes",
    name: "Volcanoes",
    version: "1.0.0",
    description: "Active and dormant volcanoes worldwide from OSM",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "Natural Disaster",
    icon: "Mountain",
    dataFile: "/data/volcanoes.geojson",
    rendering: {
      entityType: "point",
      color: "#ef4444",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: 50,
      maxEntities: 1000,
    },
  },
  "airports": {
    id: "airports",
    name: "Airports",
    version: "1.0.0",
    description: "Airports and aerodromes worldwide from OSM",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "Aviation",
    icon: "PlaneTakeoff",
    dataFile: "/data/airports.geojson",
    rendering: {
      entityType: "point",
      color: "#3b82f6",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: 50,
      maxEntities: 5000,
    },
  },
  "seaports": {
    id: "seaports",
    name: "Seaports",
    version: "1.0.0",
    description: "Harbours and seaports worldwide from OSM",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "Maritime",
    icon: "Anchor",
    dataFile: "/data/seaports.geojson",
    rendering: {
      entityType: "point",
      color: "#0ea5e9",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: 50,
      maxEntities: 5000,
    },
  },
  "lighthouses": {
    id: "lighthouses",
    name: "Lighthouses",
    version: "1.0.0",
    description: "Lighthouses worldwide from OSM",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "Maritime",
    icon: "Lamp",
    dataFile: "/data/lighthouses.geojson",
    rendering: {
      entityType: "point",
      color: "#facc15",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: 50,
      maxEntities: 5000,
    },
  },
  "spaceports": {
    id: "spaceports",
    name: "Spaceports",
    version: "1.0.0",
    description: "Space launch sites worldwide from OSM",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "Custom",
    icon: "Rocket",
    dataFile: "/data/spaceports.geojson",
    rendering: {
      entityType: "point",
      color: "#7c3aed",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: 50,
      maxEntities: 1000,
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

