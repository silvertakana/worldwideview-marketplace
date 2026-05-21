import { createHash, timingSafeEqual } from "node:crypto";

/** Deterministic SHA-256 hex of an API key. Used for O(1) DB lookup. */
export function hashApiKey(rawKey: string): string {
    return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/** Constant-time comparison of two SHA-256 hex strings. */
export function timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
