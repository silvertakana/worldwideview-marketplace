import { describe, it, expect } from "vitest";
import { validateInstanceUrl } from "./instanceValidation";

const MARKETPLACE_ORIGIN = "https://marketplace.worldwideview.dev"; // lint-url: allow

describe("validateInstanceUrl", () => {
    it("normalises a valid URL to its origin", () => {
        const result = validateInstanceUrl("http://wwv.local:3000/some/path?x=1", MARKETPLACE_ORIGIN);
        expect(result).toEqual({ ok: true, url: "http://wwv.local:3000" });
    });

    it("collapses duplicate forms (trailing slash, query) to the same origin", () => {
        const a = validateInstanceUrl("http://wwv.local:3000", MARKETPLACE_ORIGIN);
        const b = validateInstanceUrl("http://wwv.local:3000/", MARKETPLACE_ORIGIN);
        expect(a).toEqual(b);
    });

    it("rejects null and undefined inputs", () => {
        expect(validateInstanceUrl(null, MARKETPLACE_ORIGIN).ok).toBe(false);
        expect(validateInstanceUrl(undefined, MARKETPLACE_ORIGIN).ok).toBe(false);
    });

    it("rejects an empty string", () => {
        expect(validateInstanceUrl("", MARKETPLACE_ORIGIN).ok).toBe(false);
    });

    it("rejects unparseable URLs", () => {
        expect(validateInstanceUrl("not a url", MARKETPLACE_ORIGIN).ok).toBe(false);
    });

    it("rejects non-http(s) schemes", () => {
        expect(validateInstanceUrl("javascript:alert(1)", MARKETPLACE_ORIGIN).ok).toBe(false);
        expect(validateInstanceUrl("file:///etc/passwd", MARKETPLACE_ORIGIN).ok).toBe(false);
        expect(validateInstanceUrl("ftp://example.com", MARKETPLACE_ORIGIN).ok).toBe(false);
    });

    it("rejects the marketplace's own origin (loop guard)", () => {
        const result = validateInstanceUrl(MARKETPLACE_ORIGIN, MARKETPLACE_ORIGIN);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toMatch(/marketplace/);
    });

    it("accepts other subdomains of the same parent domain", () => {
        const result = validateInstanceUrl("https://app.worldwideview.dev", MARKETPLACE_ORIGIN); // lint-url: allow
        expect(result).toEqual({ ok: true, url: "https://app.worldwideview.dev" }); // lint-url: allow
    });
});
