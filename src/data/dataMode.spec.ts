import { describe, it, expect } from "vitest";
import { DATA_MODES, parseDataMode, isOfflineCapable } from "./dataMode";

describe("parseDataMode", () => {
    it("reads each known mode back unchanged", () => {
        for (const mode of DATA_MODES) {
            expect(parseDataMode(mode)).toBe(mode);
        }
    });

    it("reads a missing value as engine, the mode every tier can serve", () => {
        expect(parseDataMode(undefined)).toBe("engine");
        expect(parseDataMode(null)).toBe("engine");
    });

    it("reads an unrecognized value as engine rather than trusting it", () => {
        expect(parseDataMode("hosted-only")).toBe("engine");
        expect(parseDataMode("BUNDLED")).toBe("engine");
        expect(parseDataMode(7)).toBe("engine");
        expect(parseDataMode({ mode: "bundled" })).toBe("engine");
    });
});

describe("isOfflineCapable", () => {
    it("offers bundled and engine data to an instance with no hosted service", () => {
        expect(isOfflineCapable("bundled")).toBe(true);
        expect(isOfflineCapable("engine")).toBe(true);
    });

    it("holds back a plugin that only works against the hosted service", () => {
        expect(isOfflineCapable("hosted")).toBe(false);
    });
});
