import type { KnownPlugin } from "./types";

export const CATEGORIES = [
  "All",
  "Aviation",
  "Maritime",
  "Military",
  "Natural Disaster",
  "Infrastructure",
  "Space",
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
    icon: "Plane",
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
    icon: "Ship",
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
    id: "military-aviation",
    npmPackage: "@worldwideview/wwv-plugin-military-aviation",
    icon: "Shield",
    category: "Aviation",
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    longDescription:
      "Track military and government aircraft worldwide using the adsb.fi open feed. Identifies military transponder codes and displays aircraft with dedicated styling and filtering options.",
    changelog:
      "v1.0.0 — Renamed from wwv-plugin-military for clarity.",
  },
  {
    id: "wildfire",
    npmPackage: "@worldwideview/wwv-plugin-wildfire",
    icon: "Flame",
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
    icon: "Camera",
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
    icon: "Map",
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
    id: "military-bases",
    npmPackage: "@worldwideview/wwv-plugin-military-bases",
    icon: "Swords",
    category: "Military",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription:
      "Displays worldwide military bases, airfields, and barracks sourced from OpenStreetMap. Static GeoJSON data layer with clustered point markers — no external API calls at runtime.",
    changelog:
      "v1.0.0 — Initial release with OSM military installation data.",
  },
  // NOTE: @worldwideview/wwv-plugin-sdk is intentionally excluded from this list.
  // It is a developer peer-dependency (types + interfaces), not a user-installable plugin.
  // See docs/creating-a-plugin.md for how developers use the SDK.
  {
    id: "nuclear-facilities",
    npmPackage: "@worldwideview/wwv-plugin-nuclear",
    icon: "Atom",
    category: "Infrastructure",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription:
      "Displays 758 nuclear power plants, research reactors, and decommissioned facilities worldwide using OpenStreetMap data. Includes operator, output capacity, reactor type, and operational status metadata. Data sourced from Overpass Turbo.",
    changelog:
      "v1.0.0 — Initial release with global nuclear facility data from OSM.",
  },
  {
    id: "embassies",
    npmPackage: "@worldwideview/wwv-plugin-embassies",
    icon: "Landmark",
    category: "Custom",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription:
      "Displays 17,266 embassies, consulates, and diplomatic missions worldwide using OpenStreetMap data. Includes country, diplomatic type, and target nation metadata.",
    changelog:
      "v1.0.0 — Initial release with global diplomatic mission data from OSM.",
  },
  {
    id: "volcanoes",
    npmPackage: "@worldwideview/wwv-plugin-volcanoes",
    icon: "Mountain",
    category: "Natural Disaster",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription:
      "Displays active and dormant volcanoes worldwide using OpenStreetMap data. Static GeoJSON data layer with clustered point markers.",
    changelog: "v1.0.0 — Initial release with global volcano data from OSM.",
  },
  {
    id: "airports",
    npmPackage: "@worldwideview/wwv-plugin-airports",
    icon: "PlaneTakeoff",
    category: "Aviation",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription:
      "Displays airports and aerodromes worldwide using OpenStreetMap data. Complements the live aviation tracking plugin by showing where aircraft land.",
    changelog:
      "v1.0.0 — Initial release with global aerodrome data from OSM.",
  },
  {
    id: "seaports",
    npmPackage: "@worldwideview/wwv-plugin-seaports",
    icon: "Anchor",
    category: "Maritime",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription:
      "Displays harbours and seaports worldwide using OpenStreetMap data. Complements the live maritime tracking plugin by showing where vessels dock.",
    changelog:
      "v1.0.0 — Initial release with global harbour data from OSM.",
  },
  {
    id: "lighthouses",
    npmPackage: "@worldwideview/wwv-plugin-lighthouses",
    icon: "Lamp",
    category: "Maritime",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription:
      "Displays lighthouses worldwide using OpenStreetMap data. Iconic coastal landmarks visualized along coastlines on the 3D globe.",
    changelog:
      "v1.0.0 — Initial release with global lighthouse data from OSM.",
  },
  {
    id: "spaceports",
    npmPackage: "@worldwideview/wwv-plugin-spaceports",
    icon: "Rocket",
    category: "Space",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription:
      "Displays space launch sites worldwide using OpenStreetMap data. Includes major spaceports like Cape Canaveral, Baikonur, and Guiana Space Centre.",
    changelog:
      "v1.0.0 — Initial release with global spaceport data from OSM.",
  },

];
