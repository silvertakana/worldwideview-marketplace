/**
 * Server-side mirror of the validation rules used by
 * `captureFromInstanceQuery` in `instanceStore.ts`.
 *
 * A "valid instance URL" is one we're willing to save to a user's account or
 * 302 them to: a parseable http/https URL whose origin is not the marketplace
 * itself (which would create a redirect loop).
 *
 * The returned `url` is normalised to its origin form (no path / query /
 * trailing slash) so duplicate saves like "http://wwv.local:3000/" and
 * "http://wwv.local:3000" collapse to one row.
 */
export type InstanceValidationResult =
  | { ok: true; url: string }
  | { ok: false; reason: string }

export function validateInstanceUrl(
  raw: string | null | undefined,
  marketplaceOrigin: string,
): InstanceValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, reason: 'url is required' }
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: 'url is not parseable' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'url must use http or https' }
  }

  if (parsed.origin === marketplaceOrigin) {
    return { ok: false, reason: 'url must not be the marketplace itself' }
  }

  return { ok: true, url: parsed.origin }
}
