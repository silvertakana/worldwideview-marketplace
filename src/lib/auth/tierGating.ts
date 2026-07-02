/**
 * @deprecated Marketplace no longer stores tier/stripe info locally.
 * The canonical source is worldwideview Account API via the Phase 58 proxy.
 * Phase 60 will add the proxy read. This function now always returns "free"
 * and is kept only for backward compatibility during migration.
 */
export function getEffectiveTier(): string {
  return "free";
}
