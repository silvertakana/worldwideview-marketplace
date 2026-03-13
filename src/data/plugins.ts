export interface PluginCard {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  installs: number;
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

export const PLUGINS: PluginCard[] = [
  {
    id: "aviation",
    name: "Aviation — OpenSky Network",
    description: "Real-time aircraft tracking via OpenSky Network",
    category: "Aviation",
    icon: "✈️",
    installs: 1_240,
  },
  {
    id: "maritime",
    name: "Maritime — AIS Tracking",
    description: "Vessel tracking via AIS feeds",
    category: "Maritime",
    icon: "🚢",
    installs: 870,
  },
  {
    id: "military",
    name: "Military Aviation — adsb.fi",
    description: "Real-time military aircraft tracking via adsb.fi",
    category: "Aviation",
    icon: "🛡️",
    installs: 620,
  },
  {
    id: "wildfire",
    name: "Wildfire — NASA FIRMS",
    description: "Active fire detection via NASA FIRMS (VIIRS)",
    category: "Natural Disaster",
    icon: "🔥",
    installs: 510,
  },
  {
    id: "camera",
    name: "Cameras",
    description: "Public live cameras from across the globe",
    category: "Infrastructure",
    icon: "📷",
    installs: 430,
  },
  {
    id: "borders",
    name: "Borders & Labels",
    description: "Displays political borders and country labels on the map",
    category: "Custom",
    icon: "🗺️",
    installs: 380,
  },
  {
    id: "geojson",
    name: "GeoJSON Importer",
    description: "Import and visualize user-provided GeoJSON datasets",
    category: "Custom",
    icon: "📄",
    installs: 290,
  },
];
