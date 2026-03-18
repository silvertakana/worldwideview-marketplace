/**
 * Source of truth for verified plugin IDs.
 * A plugin appearing here will be stamped as "verified" by the
 * signed registry endpoint. All others are "unverified".
 */
export const VERIFIED_PLUGIN_IDS: readonly string[] = [
  "aviation",
  "maritime",
  "military-aviation",
  "wildfire",
  "camera",
  "borders",
  "military-bases",
  "sdk",
  "nuclear-facilities",
  "embassies",
] as const;
