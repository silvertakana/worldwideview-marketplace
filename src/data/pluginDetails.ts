import type { PluginCard } from "./plugins";

export interface PluginDetail extends PluginCard {
  longDescription: string;
  capabilities: string[];
  format: string;
  trust: string;
  compatibility: string;
  repository?: string;
  changelog: string;
}

/** Human-readable labels for capability strings */
export const CAPABILITY_LABELS: Record<string, { emoji: string; label: string }> = {
  "data:own": { emoji: "📊", label: "Own Data" },
  "network:fetch": { emoji: "🌐", label: "Network Fetch" },
  "storage:write": { emoji: "💾", label: "Storage Write" },
  "storage:read": { emoji: "📖", label: "Storage Read" },
  "ui:detail-panel": { emoji: "🖼️", label: "Detail Panel" },
  "ui:sidebar": { emoji: "📐", label: "Sidebar" },
  "ui:toolbar": { emoji: "🔧", label: "Toolbar" },
  "ui:settings": { emoji: "⚙️", label: "Settings" },
  "globe:overlay": { emoji: "🌍", label: "Globe Overlay" },
  "globe:camera": { emoji: "🎥", label: "Camera Control" },
};

export const PLUGIN_DETAILS: Record<string, PluginDetail> = {
  aviation: {
    id: "aviation",
    name: "Aviation — OpenSky Network",
    description: "Real-time aircraft tracking via OpenSky Network",
    category: "Aviation",
    icon: "✈️",
    installs: 1_240,
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch", "storage:write"],
    compatibility: ">=0.1.0",
    changelog: "v1.0.0 — Initial release with live tracking, altitude coloring, and 3D model rendering.",
    longDescription:
      "Track thousands of aircraft in real time using the OpenSky Network API. Displays aircraft with altitude-based coloring, directional 3D models, and smooth interpolation. Supports historical playback via the server-side data layer and Supabase fallback.",
  },
  maritime: {
    id: "maritime",
    name: "Maritime — AIS Tracking",
    description: "Vessel tracking via AIS feeds",
    category: "Maritime",
    icon: "🚢",
    installs: 870,
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    compatibility: ">=0.1.0",
    changelog: "v1.0.0 — Initial release with AIS-based vessel tracking and ship-type filtering.",
    longDescription:
      "Monitor global maritime traffic using AIS transponder data. Visualizes vessels with directional icons, ship-type classification, and real-time position updates on the 3D globe.",
  },
  military: {
    id: "military",
    name: "Military Aviation — adsb.fi",
    description: "Real-time military aircraft tracking via adsb.fi",
    category: "Aviation",
    icon: "🛡️",
    installs: 620,
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    compatibility: ">=0.1.0",
    changelog: "v1.0.0 — Initial release with adsb.fi military feed integration.",
    longDescription:
      "Track military and government aircraft worldwide using the adsb.fi open feed. Identifies military transponder codes and displays aircraft with dedicated styling and filtering options.",
  },
  wildfire: {
    id: "wildfire",
    name: "Wildfire — NASA FIRMS",
    description: "Active fire detection via NASA FIRMS (VIIRS)",
    category: "Natural Disaster",
    icon: "🔥",
    installs: 510,
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    compatibility: ">=0.1.0",
    changelog: "v1.0.0 — Initial release with VIIRS fire detection and confidence-based rendering.",
    longDescription:
      "Visualize active wildfires and thermal anomalies detected by NASA's VIIRS satellite instrument via the FIRMS API. Fire points are color-coded by confidence level and update automatically.",
  },
  camera: {
    id: "camera",
    name: "Cameras",
    description: "Public live cameras from across the globe",
    category: "Infrastructure",
    icon: "📷",
    installs: 430,
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own", "network:fetch"],
    compatibility: ">=0.1.0",
    changelog: "v1.0.0 — Initial release with curated public camera feeds.",
    longDescription:
      "Browse and view public live camera streams placed on the 3D globe. Click any camera marker to open a live video feed. Supports HLS, YouTube, and direct video streams.",
  },
  borders: {
    id: "borders",
    name: "Borders & Labels",
    description: "Displays political borders and country labels on the map",
    category: "Custom",
    icon: "🗺️",
    installs: 380,
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own"],
    compatibility: ">=0.1.0",
    changelog: "v1.0.0 — Initial release with GeoJSON-based political boundaries.",
    longDescription:
      "Overlays political borders and country labels on the globe using GeoJSON boundary data. Useful as a reference layer when combined with other data plugins.",
  },
  geojson: {
    id: "geojson",
    name: "GeoJSON Importer",
    description: "Import and visualize user-provided GeoJSON datasets",
    category: "Custom",
    icon: "📄",
    installs: 290,
    format: "bundle",
    trust: "built-in",
    capabilities: ["data:own"],
    compatibility: ">=0.1.0",
    changelog: "v1.0.0 — Initial release with drag-and-drop GeoJSON import.",
    longDescription:
      "Import your own GeoJSON files via drag-and-drop or file picker. Supports Point, LineString, Polygon, and MultiPolygon geometries with automatic color assignment and layer management.",
  },
};
