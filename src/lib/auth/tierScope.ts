export function scopeFor(tier: string): string {
    switch (tier) {
        case "enterprise": return "plugins:read plugins:write plugins:admin";
        case "pro":        return "plugins:read plugins:write";
        case "free":
        default:           return "plugins:read";
    }
}

export interface KeyAccessRecord {
    scope?: string | null;
    tier?: string | null;
}

// A key may carry its own scope and tier. When it does not, the ticket keeps the
// historical free/read-only shape, so nothing that exists today changes
// behaviour. The scope is the claim the data engine enforces.
export function resolveTicketAccess(key: KeyAccessRecord): { tier: string; scope: string } {
    const tier = key.tier?.trim() || "free";
    const scope = key.scope?.trim() || scopeFor(tier);
    return { tier, scope };
}
