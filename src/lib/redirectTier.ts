export type RedirectTier = 'loopback' | 'operator' | 'self-hosted' | 'rejected'

export interface RedirectClassification {
  allowed: boolean
  tier: RedirectTier
  origin: string
}

/**
 * Classifies a redirect URI into one of four tiers:
 *  - 'loopback': wwv://oauth/callback or any http://localhost:<port>/... / http://127.0.0.1:<port>/... (RFC 8252 S7.3)
 *  - 'operator': https origin listed in OPERATOR_ORIGINS (comma-separated env allowlist)
 *  - 'self-hosted': any other https origin
 *  - 'rejected': unparseable, non-http(s), or http non-loopback origins
 *
 * Feature flag: OAUTH_REDIRECT_POLICY=v1 disables the operator and self-hosted
 * tiers (legacy loopback-only behavior) for instant rollback. Unset or 'v2'
 * (the default) enables all three tiers.
 */
export function classifyRedirectTier(redirectUri: string): RedirectClassification {
  // Custom scheme shortcut (URL constructor rejects non-http(s) schemes in many runtimes)
  if (redirectUri === 'wwv://oauth/callback') {
    return { allowed: true, tier: 'loopback', origin: '' }
  }

  // v1 = legacy loopback-only validator (instant rollback via config, no code revert)
  const v1 = process.env.OAUTH_REDIRECT_POLICY === 'v1'

  let parsed: URL
  try {
    parsed = new URL(redirectUri)
  } catch {
    return { allowed: false, tier: 'rejected', origin: '' }
  }

  const origin = parsed.origin

  // Loopback: any localhost port over plain HTTP (RFC 8252 S7.3)
  if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
    return { allowed: true, tier: 'loopback', origin }
  }

  if (parsed.protocol === 'https:') {
    // v1 restores the legacy behavior: any https origin is rejected
    if (v1) {
      return { allowed: false, tier: 'rejected', origin: '' }
    }

    const operatorOrigins = (process.env.OPERATOR_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0)

    // Operator allowlist: https origins explicitly approved via env
    if (operatorOrigins.includes(origin)) {
      return { allowed: true, tier: 'operator', origin }
    }

    // Any other https origin is a self-hosted instance
    return { allowed: true, tier: 'self-hosted', origin }
  }

  // Anything else (including http: non-loopback) is rejected
  return { allowed: false, tier: 'rejected', origin }
}
