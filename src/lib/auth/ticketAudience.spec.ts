import { describe, it, expect } from "vitest";
import { resolveAudience, DEFAULT_AUDIENCE } from "./ticketAudience";

// The marketplace issues tickets for other engines too, so the audience is not
// an allowlist: it is caller-supplied by design. What is rejected is a value
// that cannot be an engine identifier.
describe("resolveAudience", () => {
    it("defaults to the standard engine audience when none is requested", () => {
        expect(resolveAudience(undefined)).toBe(DEFAULT_AUDIENCE);
        expect(resolveAudience("")).toBe(DEFAULT_AUDIENCE);
    });

    it("keeps an audience that names another engine", () => {
        expect(resolveAudience("wwv-aviation-engine")).toBe("wwv-aviation-engine");
        expect(resolveAudience("wwv-data-engines")).toBe("wwv-data-engines");
    });

    it("refuses a non-string audience instead of coercing it", () => {
        expect(resolveAudience({ evil: true })).toBeNull();
        expect(resolveAudience(42)).toBeNull();
    });

    it("refuses an audience containing whitespace or control characters", () => {
        expect(resolveAudience("engine one")).toBeNull();
        expect(resolveAudience("engine\nInjected")).toBeNull();
    });

    it("refuses an absurdly long audience", () => {
        expect(resolveAudience("e".repeat(200))).toBeNull();
    });
});
