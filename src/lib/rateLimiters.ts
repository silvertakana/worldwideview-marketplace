import { RateLimiter, getClientIp } from "./rateLimit";

export { getClientIp };

/**
 * Pre-configured rate limiters for OAuth/auth endpoints.
 * These are singletons — one instance per endpoint, shared across requests.
 * Limits follow the OAuth redesign spec (RFC 9700 §4.13 code brute-force
 * protection and DoS mitigation).
 */

/** GET /oauth/authorize — prevents authorize-page DoS and parameter probing. */
export const authorizeLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 30,
});

/** POST /api/oauth/token — code redemption is low-frequency by design. */
export const tokenLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 20,
});

/** POST /api/oauth/token — failed redemptions (brute-force on code/verifier). */
export const tokenFailureLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 5,
});

/** POST /api/auth/exchange — the globe caches JWTs for 4.5 min; 60/min is 130x headroom. */
export const exchangeLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 60,
});

/** POST /api/oauth/revoke — revocation is rare; 10/min is generous. */
export const revokeLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 10,
});
