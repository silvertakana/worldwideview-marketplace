/** Marketplace-only metadata (not stored in npm). */
export interface KnownPlugin {
  id: string;
  npmPackage: string;
  icon: string;
  category: string;
  format: "declarative" | "static" | "bundle";
  /** Omitted for a plugin whose data mode has not been recorded; reads as engine. */
  dataMode?: DataMode;
  trust: "built-in" | "verified" | "unverified";
  capabilities: string[];
  longDescription: string;
  changelog: string;
}

import type { DataMode } from "./dataMode";

/** Data used to render a plugin card on the browse page. */
export interface PluginCard {
  id: string;
  npmPackage: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  installs: number;
  author: string;
  version: string;
  format: "declarative" | "static" | "bundle";
  /** How this plugin's data arrives; drives which tier can install it. */
  dataMode: DataMode;
  trust: "built-in" | "verified" | "unverified";
  tags: string[];
  updatedAt: string;
}

/** Full detail data shown on the plugin detail page. */
export interface PluginDetail extends PluginCard {
  longDescription: string;
  capabilities: string[];
  compatibility: string;
  repository?: string;
  changelog: string;
  readme?: string;
}

/** Shape of the npm registry metadata we consume. */
export interface NpmPackageMeta {
  name: string;
  description: string;
  version: string;
  author: string;
  keywords: string[];
  /** "YYYY-MM-DD"; undefined when the npm packument publishes no date. */
  updatedAt?: string;
  repository?: string;
  readme?: string;
  changelog?: string;
}
