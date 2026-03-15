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
