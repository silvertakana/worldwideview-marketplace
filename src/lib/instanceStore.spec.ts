import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { captureFromInstanceQuery } from "./instanceStore";

const MARKETPLACE_ORIGIN = "https://marketplace.worldwideview.dev";
const STORAGE_KEY = "wwv_instance_url";

describe("captureFromInstanceQuery", () => {
    let storage: Record<string, string>;
    let replacedUrl: string | null;

    function setupWindow(search: string, pathname = "/") {
        vi.stubGlobal("localStorage", {
            getItem: (k: string) => storage[k] ?? null,
            setItem: (k: string, v: string) => { storage[k] = v; },
            removeItem: (k: string) => { delete storage[k]; },
        });
        vi.stubGlobal("history", {
            replaceState: (_s: unknown, _t: string, url: string) => { replacedUrl = url; },
        });
        vi.stubGlobal("window", {
            location: { search, pathname, origin: MARKETPLACE_ORIGIN },
        });
    }

    beforeEach(() => {
        storage = {};
        replacedUrl = null;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns null when no from_instance param is present", () => {
        setupWindow("");
        expect(captureFromInstanceQuery()).toBeNull();
    });

    it("captures a valid http instance URL", () => {
        setupWindow("?from_instance=http%3A%2F%2Flocalhost%3A3000");
        const result = captureFromInstanceQuery();
        expect(result).toBe("http://localhost:3000");
        expect(storage[STORAGE_KEY]).toBe("http://localhost:3000");
    });

    it("captures a valid https instance URL", () => {
        setupWindow("?from_instance=https%3A%2F%2Fmy.instance.example");
        expect(captureFromInstanceQuery()).toBe("https://my.instance.example");
        expect(storage[STORAGE_KEY]).toBe("https://my.instance.example");
    });

    it("normalises to origin only (strips path from the inbound param)", () => {
        setupWindow("?from_instance=http%3A%2F%2Flocalhost%3A3000%2Fsome%2Fpath");
        expect(captureFromInstanceQuery()).toBe("http://localhost:3000");
        expect(storage[STORAGE_KEY]).toBe("http://localhost:3000");
    });

    it("rejects an invalid (non-parseable) URL", () => {
        setupWindow("?from_instance=not-a-url");
        expect(captureFromInstanceQuery()).toBeNull();
        expect(storage[STORAGE_KEY]).toBeUndefined();
    });

    it("rejects javascript: protocol", () => {
        setupWindow(`?from_instance=${encodeURIComponent("javascript:alert(1)")}`);
        expect(captureFromInstanceQuery()).toBeNull();
        expect(storage[STORAGE_KEY]).toBeUndefined();
    });

    it("rejects self-referential origin (marketplace own origin)", () => {
        setupWindow(`?from_instance=${encodeURIComponent(MARKETPLACE_ORIGIN)}`);
        expect(captureFromInstanceQuery()).toBeNull();
        expect(storage[STORAGE_KEY]).toBeUndefined();
    });

    it("strips from_instance from the visible URL after capture", () => {
        setupWindow("?from_instance=http%3A%2F%2Flocalhost%3A3000");
        captureFromInstanceQuery();
        expect(replacedUrl).toBe("/");
    });

    it("preserves other query params when stripping from_instance", () => {
        setupWindow("?tab=browse&from_instance=http%3A%2F%2Flocalhost%3A3000");
        captureFromInstanceQuery();
        expect(replacedUrl).toBe("/?tab=browse");
    });

    it("handles re-capture of the same URL gracefully", () => {
        storage[STORAGE_KEY] = "http://localhost:3000";
        setupWindow("?from_instance=http%3A%2F%2Flocalhost%3A3000");
        const result = captureFromInstanceQuery();
        expect(result).toBe("http://localhost:3000");
        expect(storage[STORAGE_KEY]).toBe("http://localhost:3000");
    });
});
