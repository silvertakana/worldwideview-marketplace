import { NextResponse } from "next/server";

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-server deployments (Coolify single instance).
 * For distributed rate limiting, swap to @upstash/ratelimit.
 */
export class RateLimiter {
    private readonly windowMs: number;
    private readonly maxRequests: number;
    private readonly store = new Map<string, RateLimitEntry>();
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(opts: { windowMs: number; maxRequests: number }) {
        this.windowMs = opts.windowMs;
        this.maxRequests = opts.maxRequests;
        // Periodic cleanup to prevent memory leaks
        this.cleanupTimer = setInterval(() => this.cleanup(), opts.windowMs * 2);
    }

    /** Returns null if allowed, or a 429 Response if rate-limited. */
    check(key: string): NextResponse | null {
        const now = Date.now();
        const entry = this.store.get(key);

        if (!entry || now > entry.resetAt) {
            this.store.set(key, { count: 1, resetAt: now + this.windowMs });
            return null;
        }

        entry.count += 1;
        if (entry.count > this.maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            return NextResponse.json(
                { error: "Too many requests" },
                {
                    status: 429,
                    headers: { "Retry-After": String(retryAfter) },
                },
            );
        }

        return null;
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now > entry.resetAt) this.store.delete(key);
        }
    }

    destroy(): void {
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    }
}

/**
 * Extract the real client IP from request headers.
 *
 * Reverse-proxy assumption: this app is always behind a trusted reverse proxy
 * (Caddy on Coolify, or Cloudflare). The proxy appends the real client IP as
 * the RIGHTMOST entry in x-forwarded-for. Using the leftmost entry is unsafe
 * because an attacker can inject arbitrary IPs at the front of that header
 * before the request reaches the proxy.
 *
 * Override: set WWV_TRUSTED_IP_HEADER to a platform-specific header that
 * carries the guaranteed client IP (e.g. "cf-connecting-ip" for Cloudflare,
 * "x-real-ip" for Nginx). When set, that header is used directly.
 *
 * Falls back to "unknown" when no header is present (e.g. in unit tests).
 */
export function getClientIp(request: Request): string {
    const override = process.env.WWV_TRUSTED_IP_HEADER?.trim().toLowerCase();
    if (override) {
        const val = request.headers.get(override)?.trim();
        if (val) return val;
    }

    // Use the rightmost (proxy-appended) entry from x-forwarded-for, not the
    // leftmost (client-controlled) entry.
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
        const entries = xff.split(",");
        const rightmost = entries[entries.length - 1]?.trim();
        if (rightmost) return rightmost;
    }

    return request.headers.get("x-real-ip")?.trim() || "unknown";
}
