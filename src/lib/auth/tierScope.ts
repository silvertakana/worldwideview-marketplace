export function scopeFor(tier: string): string {
    switch (tier) {
        case "enterprise": return "plugins:read plugins:write plugins:admin";
        case "pro":        return "plugins:read plugins:write";
        case "free":
        default:           return "plugins:read";
    }
}
