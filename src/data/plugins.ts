export interface PluginCard {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  installs: number;
  author: string;
  version: string;
  format: "declarative" | "static" | "bundle";
  trust: "built-in" | "verified" | "unverified";
  tags: string[];
  updatedAt: string;
}

export const CATEGORIES = [
  "All",
  "Aviation",
  "Maritime",
  "Natural Disaster",
  "Infrastructure",
  "Custom",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FORMAT_LABELS: Record<PluginCard["format"], string> = {
  declarative: "JSON-only",
  static: "Static",
  bundle: "Code Bundle",
};

export const PLUGINS: PluginCard[] = [
  {
    id: "aviation",
    name: "Aviation — OpenSky Network",
    description: "Real-time aircraft tracking via OpenSky Network",
    category: "Aviation",
    icon: "✈️",
    installs: 1_240,
    author: "WorldWideView",
    version: "1.0.0",
    format: "bundle",
    trust: "built-in",
    tags: ["real-time", "tracking", "aircraft", "opensky"],
    updatedAt: "2026-03-10",
  },
  {
    id: "maritime",
    name: "Maritime — AIS Tracking",
    description: "Vessel tracking via AIS feeds",
    category: "Maritime",
    icon: "🚢",
    installs: 870,
    author: "WorldWideView",
    version: "1.0.0",
    format: "bundle",
    trust: "built-in",
    tags: ["real-time", "tracking", "vessels", "ais"],
    updatedAt: "2026-03-10",
  },
  {
    id: "military",
    name: "Military Aviation — adsb.fi",
    description: "Real-time military aircraft tracking via adsb.fi",
    category: "Aviation",
    icon: "🛡️",
    installs: 620,
    author: "WorldWideView",
    version: "1.0.0",
    format: "bundle",
    trust: "built-in",
    tags: ["real-time", "tracking", "military", "adsb"],
    updatedAt: "2026-03-12",
  },
  {
    id: "wildfire",
    name: "Wildfire — NASA FIRMS",
    description: "Active fire detection via NASA FIRMS (VIIRS)",
    category: "Natural Disaster",
    icon: "🔥",
    installs: 510,
    author: "WorldWideView",
    version: "1.0.0",
    format: "bundle",
    trust: "built-in",
    tags: ["fire", "nasa", "satellite", "viirs"],
    updatedAt: "2026-03-08",
  },
  {
    id: "camera",
    name: "Cameras",
    description: "Public live cameras from across the globe",
    category: "Infrastructure",
    icon: "📷",
    installs: 430,
    author: "WorldWideView",
    version: "1.0.0",
    format: "bundle",
    trust: "built-in",
    tags: ["cameras", "live", "streaming", "infrastructure"],
    updatedAt: "2026-03-09",
  },
  {
    id: "borders",
    name: "Borders & Labels",
    description: "Displays political borders and country labels on the map",
    category: "Custom",
    icon: "🗺️",
    installs: 380,
    author: "WorldWideView",
    version: "1.0.0",
    format: "bundle",
    trust: "built-in",
    tags: ["borders", "labels", "countries", "overlay"],
    updatedAt: "2026-03-06",
  },
  {
    id: "geojson",
    name: "GeoJSON Importer",
    description: "Import and visualize user-provided GeoJSON datasets",
    category: "Custom",
    icon: "📄",
    installs: 290,
    author: "WorldWideView",
    version: "1.0.0",
    format: "bundle",
    trust: "built-in",
    tags: ["geojson", "import", "custom-data", "visualization"],
    updatedAt: "2026-03-05",
  },
];
