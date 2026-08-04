import { describe, it, expect } from "vitest";
import { isLookalikeHostname } from "./lookalikeDomain";

describe("isLookalikeHostname", () => {
    it("flags an IDN / punycode hostname", () => {
        expect(isLookalikeHostname("xn--g1obe.com")).toBe(true);
    });

    it("flags a confusable-substituted target (w0rldview.com)", () => {
        expect(isLookalikeHostname("w0rldview.com")).toBe(true);
    });

    it("flags a confusable-substituted target (g1obe.com)", () => {
        expect(isLookalikeHostname("g1obe.com")).toBe(true);
    });

    it("does NOT flag the user's own literal domain (myglobe.com)", () => {
        expect(isLookalikeHostname("myglobe.com")).toBe(false);
    });

    it("does NOT flag a legitimate subdomain of a target (demo.worldwideview.dev)", () => {
        expect(isLookalikeHostname("demo.worldwideview.dev")).toBe(false);
    });

    it("flags a subdomain impostor of a target (worldwideview.evil.com)", () => {
        expect(isLookalikeHostname("worldwideview.evil.com")).toBe(true);
    });

    it("flags a subdomain impostor embedding a target (myglobe.com.evil.com)", () => {
        expect(isLookalikeHostname("myglobe.com.evil.com")).toBe(true);
    });
});
