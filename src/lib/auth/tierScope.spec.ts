import { describe, it, expect } from "vitest";
import { scopeFor, resolveTicketAccess } from "./tierScope";

describe("scopeFor", () => {
    it("gives an unknown tier the read-only scope", () => {
        expect(scopeFor("something-new")).toBe("plugins:read");
    });
});

describe("resolveTicketAccess", () => {
    it("keeps today's behaviour for a key with no tier and no scope", () => {
        expect(resolveTicketAccess({})).toEqual({ tier: "free", scope: "plugins:read" });
    });

    it("uses the tier stored on the key", () => {
        expect(resolveTicketAccess({ tier: "demo" })).toEqual({ tier: "demo", scope: "plugins:read" });
    });

    it("lets a scope stored on the key win over the tier default", () => {
        expect(resolveTicketAccess({ tier: "demo", scope: "plugins:read:earthquakes" }))
            .toEqual({ tier: "demo", scope: "plugins:read:earthquakes" });
    });

    it("treats a blank scope as absent", () => {
        expect(resolveTicketAccess({ scope: "   " })).toEqual({ tier: "free", scope: "plugins:read" });
    });
});
