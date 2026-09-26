export const DEFAULT_AUDIENCE = "wwv-data-engine";

// Tickets are minted for other engines too - the caller supplies the audience -
// so this is a shape check, not an allowlist. It rejects values that cannot be
// an engine identifier: non-strings, whitespace or control characters, and
// absurd lengths.
const AUDIENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const AUDIENCE_MAX_LENGTH = 128;

export function resolveAudience(requested: unknown): string | null {
    if (requested === undefined || requested === null || requested === "") return DEFAULT_AUDIENCE;
    if (typeof requested !== "string") return null;
    const candidate = requested.trim();
    if (candidate.length === 0) return DEFAULT_AUDIENCE;
    if (candidate.length > AUDIENCE_MAX_LENGTH) return null;
    return AUDIENCE_PATTERN.test(candidate) ? candidate : null;
}
