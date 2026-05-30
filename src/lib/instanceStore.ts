const STORAGE_KEY = "wwv_instance_url";
const TOKEN_KEY = "wwv_marketplace_token";

/** Read the saved WWV instance URL from localStorage. */
export function getInstanceUrl(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
}

/** Save the WWV instance URL to localStorage. */
export function setInstanceUrl(url: string): void {
    const normalized = url.replace(/\/+$/, ""); // strip trailing slash
    localStorage.setItem(STORAGE_KEY, normalized);
}

/** Clear the saved instance URL. */
export function clearInstanceUrl(): void {
    localStorage.removeItem(STORAGE_KEY);
}

/** Read the marketplace JWT issued by WWV on install. */
export function getMarketplaceToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

/** Persist the marketplace JWT. */
export function setMarketplaceToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

/** Clear the marketplace JWT (e.g. on logout or instance change). */
export function clearMarketplaceToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Reads ?from_instance=<url> from the current location, validates it,
 * saves it to localStorage, and strips the param from the URL bar.
 *
 * Validation rules:
 * - Must be a parseable URL with http: or https: protocol
 * - Must NOT be the marketplace's own origin (self-referential loop guard)
 *
 * Returns the captured origin string, or null if absent / invalid.
 */
export function captureFromInstanceQuery(): string | null {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("from_instance");
    if (!raw) return null;

    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        return null;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.origin === window.location.origin) return null;

    const normalized = parsed.origin;
    if (getInstanceUrl() !== normalized) {
        setInstanceUrl(normalized);
    }

    params.delete("from_instance");
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
    history.replaceState(null, "", newUrl);

    return normalized;
}

/** A WorldWideView instance that the user has previously linked to their account. */
export interface SavedInstance {
    id: string;
    url: string;
    nickname?: string | null;
    lastUsedAt: string;
}

/**
 * Fetches the list of linked instances for the currently authenticated user.
 * Returns an empty array if unauthenticated or if the request fails.
 * Never throws.
 */
export async function fetchUserInstances(): Promise<SavedInstance[]> {
    try {
        const res = await fetch("/api/me/instances");
        if (!res.ok) return [];
        const data = await res.json();
        return (data.instances ?? []) as SavedInstance[];
    } catch {
        return [];
    }
}
