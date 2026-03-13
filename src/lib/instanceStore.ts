const STORAGE_KEY = "wwv_instance_config";

export interface InstanceConfig {
    url: string;
    token: string;
}

/** Read the saved WWV instance config from localStorage. */
export function getInstanceConfig(): InstanceConfig | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.token) return parsed;
        return null;
    } catch {
        return null;
    }
}

/** Save the WWV instance config to localStorage. */
export function setInstanceConfig(url: string, token: string): void {
    const normalized = url.replace(/\/+$/, ""); // strip trailing slash
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: normalized, token }));
}

/** Clear the saved instance config. */
export function clearInstanceConfig(): void {
    localStorage.removeItem(STORAGE_KEY);
}
