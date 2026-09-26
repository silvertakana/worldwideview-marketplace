/**
 * How a plugin's data reaches the globe.
 *
 * - `bundled` ships its data with the plugin and needs no service at all.
 * - `engine` streams from a data engine, which can be the local one an offline
 *   instance runs or the hosted one a connected instance uses.
 * - `hosted` only works against the hosted service.
 *
 * The onboarding wizard offers the first two to an offline instance.
 */
export const DATA_MODES = ["bundled", "engine", "hosted"] as const;

export type DataMode = (typeof DATA_MODES)[number];

/**
 * Reads a stored mode. Anything unrecognized, including a missing value, reads
 * as `engine`: the safe reading is the mode that works in every tier, never one
 * that would offer a hosted-only plugin to an offline instance.
 */
export function parseDataMode(value: unknown): DataMode {
    return typeof value === "string" && (DATA_MODES as readonly string[]).includes(value)
        ? (value as DataMode)
        : "engine";
}

/** Whether a plugin in this mode can serve an instance with no hosted service. */
export function isOfflineCapable(mode: DataMode): boolean {
    return mode !== "hosted";
}
