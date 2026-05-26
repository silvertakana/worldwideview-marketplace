/**
 * Returns a same-origin proxy URL for a DiceBear adventurer-neutral SVG avatar.
 *
 * The /api/avatar route handler SHA-256 hashes the seed before forwarding to
 * the DiceBear external service, ensuring raw PII (email, display name) is
 * never sent to that service by the browser.
 *
 * @param seed - A stable identifier (e.g. user email) used to derive the avatar.
 * @returns Relative same-origin URL: /api/avatar?seed=<encoded>
 */
export function diceBearUrl(seed: string): string {
  return `/api/avatar?seed=${encodeURIComponent(seed)}`
}
