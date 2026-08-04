/**
 * Lookalike-domain heuristic for the OAuth consent screen (self-hosted tier only).
 *
 * Advisory only — it never blocks. The user is the authority on their own
 * domain, so the heuristic merely surfaces a yellow warning when a destination
 * hostname looks like it could impersonate a known WorldWideView surface.
 */

const CONFUSABLE_TARGETS = [
  'worldwideview',
  'worldview',
  'wwv',
  'globe',
  'marketplace',
]

// Typosquat-ish TLD suffixes (e.g. `c0m` for `com`), checked against the last label.
const TYPOSQUAT_SUFFIXES = new Set(['c0m', 'corn', 'con', 'cm'])

/**
 * Skeleton of a hostname after confusable-character substitution
 * (o→0, l→1, i→1, s→5).
 */
function skeletonize(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/o/g, '0')
    .replace(/l/g, '1')
    .replace(/i/g, '1')
    .replace(/s/g, '5')
}

/**
 * True when `hostname` (scheme-less, e.g. "myglobe.com") trips one of the
 * lookalike signals: IDN/punycode, a confusable-substituted form of a known
 * target, or a typosquat TLD suffix.
 */
export function isLookalikeHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase()

  // (a) IDN / punycode — often hides homoglyph attacks
  if (lower.includes('xn--')) return true

  // (b) Confusable characters — flag when a substituted form of a known target
  // appears (e.g. "gl0be.com"), but NOT when the literal target word is already
  // present (e.g. "myglobe.com" is a normal self-hosted domain, not a lookalike).
  const skeleton = skeletonize(lower)
  for (const target of CONFUSABLE_TARGETS) {
    if (!lower.includes(target) && skeleton.includes(skeletonize(target))) return true
  }

  // (c) Subdomain impostor — an attacker who owns evil.com can mint
  // "worldwideview.evil.com" or "myglobe.com.evil.com". Every label before the
  // registrable domain + TLD (i.e. labels.slice(0, -2)) is attacker-controlled,
  // so flag any confusable target that appears in those labels — as a whole
  // label or embedded (e.g. "myglobe" contains "globe").
  const labels = lower.split('.')
  if (labels.length > 2) {
    const attackerLabels = labels.slice(0, -2)
    for (const target of CONFUSABLE_TARGETS) {
      if (attackerLabels.some((l) => l.includes(target) || skeletonize(l).includes(skeletonize(target)))) return true
    }
  }

  // (d) Typosquat-ish TLD suffix
  const lastLabel = lower.split('.').pop() ?? ''
  if (TYPOSQUAT_SUFFIXES.has(lastLabel)) return true

  return false
}
