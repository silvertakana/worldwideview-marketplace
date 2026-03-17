import type { KnownPlugin } from "./types";

export const CATEGORIES = [
  "All",
  "Aviation",
  "Maritime",
  "Natural Disaster",
  "Infrastructure",
  "Custom",
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Curated list of known @worldwideview plugins.
 * Fields that npm already stores (version, description, author, keywords,
 * updatedAt) are intentionally omitted — they come from the registry at
 * runtime via npmRegistry.ts.
 */
export const KNOWN_PLUGINS: KnownPlugin[] = [
  {
    id: "aviation",
    npmPackage: "@worldwideview/wwv-plugin-aviation",
    icon: "✈️",
    category: "Aviation",
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch", "storage:write"],
    longDescription:
      "Track thousands of aircraft in real time using the OpenSky Network API. Displays aircraft with altitude-based coloring, directional 3D models, and smooth interpolation. Supports historical playback via the server-side data layer and Supabase fallback.",
    changelog:
      "v1.0.0 — Initial release with live tracking, altitude coloring, and 3D model rendering.",
  },
  {
    id: "maritime",
    npmPackage: "@worldwideview/wwv-plugin-maritime",
    icon: "🚢",
    category: "Maritime",
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    longDescription:
      "Monitor global maritime traffic using AIS transponder data. Visualizes vessels with directional icons, ship-type classification, and real-time position updates on the 3D globe.",
    changelog:
      "v1.0.0 — Initial release with AIS-based vessel tracking and ship-type filtering.",
  },
  {
    id: "military",
    npmPackage: "@worldwideview/wwv-plugin-military",
    icon: "🛡️",
    category: "Aviation",
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    longDescription:
      "Track military and government aircraft worldwide using the adsb.fi open feed. Identifies military transponder codes and displays aircraft with dedicated styling and filtering options.",
    changelog:
      "v1.0.0 — Initial release with adsb.fi military feed integration.",
  },
  {
    id: "wildfire",
    npmPackage: "@worldwideview/wwv-plugin-wildfire",
    icon: "🔥",
    category: "Natural Disaster",
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    longDescription:
      "Visualize active wildfires and thermal anomalies detected by NASA's VIIRS satellite instrument via the FIRMS API. Fire points are color-coded by confidence level and update automatically.",
    changelog:
      "v1.0.0 — Initial release with VIIRS fire detection and confidence-based rendering.",
  },
  {
    id: "camera",
    npmPackage: "@worldwideview/wwv-plugin-camera",
    icon: "📷",
    category: "Infrastructure",
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    longDescription:
      "Browse and view public live camera streams placed on the 3D globe. Click any camera marker to open a live video feed. Supports HLS, YouTube, and direct video streams.",
    changelog: "v1.0.0 — Initial release with curated public camera feeds.",
  },
  {
    id: "borders",
    npmPackage: "@worldwideview/wwv-plugin-borders",
    icon: "🗺️",
    category: "Custom",
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own"],
    longDescription:
      "Overlays political borders and country labels on the globe using GeoJSON boundary data. Useful as a reference layer when combined with other data plugins.",
    changelog:
      "v1.0.0 — Initial release with GeoJSON-based political boundaries.",
  },
  {
    id: "sdk",
    npmPackage: "@worldwideview/wwv-plugin-sdk",
    icon: "🧰",
    category: "Custom",
    format: "bundle",
    trust: "built-in",
    capabilities: [],
    longDescription:
      "Plugin SDK — types, interfaces, and utilities for building WorldWideView globe plugins. Required as a peer dependency by all other plugins.",
    changelog: "v1.0.0 — Initial release with core types and interfaces.",
  },
];
