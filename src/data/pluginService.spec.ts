import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Plugin, NpmCache } from "@prisma/client";

const mockPlugin = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
};

const mockNpmCache = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
    prisma: {
        plugin: mockPlugin,
        npmCache: mockNpmCache,
    },
}));

const {
    getAllPlugins,
    getPluginById,
    searchPlugins,
} = await import("@/data/pluginService");

function makePlugin(overrides: Partial<Plugin> = {}): Plugin {
    return {
        id: "aviation",
        npmPackage: "@worldwideview/wwv-plugin-aviation",
        icon: "Plane",
        category: "transportation",
        format: "bundle",
        trust: "verified",
        capabilities: JSON.stringify(["data:own", "network:fetch"]),
        longDescription: "Real-time flight tracking data feed for the globe.",
        changelog: "v1.0.0 initial release",
        addedAt: new Date("2026-01-01T00:00:00Z"),
        installs: 0,
        ...overrides,
    };
}

function makeCache(overrides: Partial<NpmCache> = {}): NpmCache {
    return {
        npmPackage: "@worldwideview/wwv-plugin-aviation",
        name: "@worldwideview/wwv-plugin-aviation",
        description: "Live aviation data feed",
        version: "1.2.3",
        author: "Jane Doe",
        keywords: JSON.stringify(["flights", "aviation"]),
        repository: "https://github.com/silvertakana/wwv-plugins",
        readme: "# Aviation\n\nFlight data docs.",
        changelog: "## Changelog\n\n- v1.2.3 fixes",
        updatedAt: "2026-07-01",
        crawledAt: new Date("2026-07-02T00:00:00Z"),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("getAllPlugins", () => {
    it("queries only non-pending plugins", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        await getAllPlugins();

        expect(mockPlugin.findMany).toHaveBeenCalledWith({
            where: { trust: { not: "pending" } },
        });
    });

    it("merges npm cache metadata into the card", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([makeCache()]);

        const cards = await getAllPlugins();

        expect(cards).toHaveLength(1);
        expect(cards[0]).toMatchObject({
            id: "aviation",
            npmPackage: "@worldwideview/wwv-plugin-aviation",
            name: "Aviation",
            description: "Live aviation data feed",
            category: "transportation",
            icon: "Plane",
            author: "Jane Doe",
            version: "1.2.3",
            format: "bundle",
            trust: "verified",
            tags: ["flights", "aviation"],
            updatedAt: "2026-07-01",
        });
    });

    it("queries npm cache for exactly the discovered npm packages", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([
            makePlugin(),
            makePlugin({ id: "storms", npmPackage: "@worldwideview/wwv-plugin-storms" }),
        ]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        await getAllPlugins();

        expect(mockNpmCache.findMany).toHaveBeenCalledWith({
            where: {
                npmPackage: {
                    in: [
                        "@worldwideview/wwv-plugin-aviation",
                        "@worldwideview/wwv-plugin-storms",
                    ],
                },
            },
        });
    });

    it("falls back to dbPlugin.id for the name when npm name is absent", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins();

        expect(cards[0].name).toBe("aviation");
    });

    it("derives a formatted title from the npm name", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([makeCache()]);

        const cards = await getAllPlugins();

        expect(cards[0].name).toBe("Aviation");
    });

    it("formats multi-word npm names with title casing", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([
            makePlugin({ id: "phone-lookup", npmPackage: "@worldwideview/wwv-plugin-phone-lookup" }),
        ]);
        mockNpmCache.findMany.mockResolvedValueOnce([
            makeCache({ npmPackage: "@worldwideview/wwv-plugin-phone-lookup", name: "@worldwideview/wwv-plugin-phone-lookup" }),
        ]);

        const cards = await getAllPlugins();

        expect(cards[0].name).toBe("Phone Lookup");
    });

    it("falls back to db id when npm name is just the stripped prefix", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([
            makeCache({ name: "@worldwideview/wwv-plugin-" }),
        ]);

        const cards = await getAllPlugins();

        expect(cards[0].name).toBe("aviation");
    });

    it("uses npm description when present", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([makeCache()]);

        const cards = await getAllPlugins();

        expect(cards[0].description).toBe("Live aviation data feed");
    });

    it("truncates the db longDescription to 80 chars when npm is absent", async () => {
        const long = "x".repeat(200);
        mockPlugin.findMany.mockResolvedValueOnce([
            makePlugin({ longDescription: long }),
        ]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins();

        expect(cards[0].description).toBe(long.slice(0, 80));
    });

    it("uses the full db longDescription when under 80 chars and npm is absent", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins();

        expect(cards[0].description).toBe("Real-time flight tracking data feed for the globe.");
    });

    it("reports the plugin's real install count from the db", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([
            makePlugin({ installs: 42 }),
        ]);
        mockNpmCache.findMany.mockResolvedValueOnce([makeCache()]);

        const cards = await getAllPlugins();

        expect(cards[0].installs).toBe(42);
    });

    it("defaults author to WorldWideView without npm data", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins();

        expect(cards[0].author).toBe("WorldWideView");
    });

    it("defaults version to 0.0.0 without npm data", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins();

        expect(cards[0].version).toBe("0.0.0");
    });

    it("defaults tags to an empty array without npm data", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins();

        expect(cards[0].tags).toEqual([]);
    });

    it("defaults updatedAt to em-dash without npm data", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins();

        expect(cards[0].updatedAt).toBe("—");
    });

    it("surfaces the stored unknown updatedAt when the npm cache has no date", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([
            makeCache({ updatedAt: "unknown" }),
        ]);

        const cards = await getAllPlugins();

        expect(cards[0].updatedAt).toBe("unknown");
    });

    it("filters by category when a category is given", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([
            makePlugin(),
            makePlugin({ id: "storms", category: "weather" }),
        ]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins("weather");

        expect(cards.map((c) => c.id)).toEqual(["storms"]);
    });

    it("returns all plugins for the All category", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([
            makePlugin(),
            makePlugin({ id: "storms", category: "weather" }),
        ]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins("All");

        expect(cards).toHaveLength(2);
    });

    it("returns an empty array when no plugins exist", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins();

        expect(cards).toEqual([]);
    });
});

describe("getPluginById", () => {
    it("returns the merged detail for a known plugin", async () => {
        mockPlugin.findUnique.mockResolvedValueOnce(makePlugin());
        mockNpmCache.findUnique.mockResolvedValueOnce(makeCache());

        const detail = await getPluginById("aviation");

        expect(detail).toMatchObject({
            id: "aviation",
            name: "Aviation",
            longDescription: "Real-time flight tracking data feed for the globe.",
            capabilities: ["data:own", "network:fetch"],
            compatibility: ">=0.1.0",
            repository: "https://github.com/silvertakana/wwv-plugins",
            changelog: "## Changelog\n\n- v1.2.3 fixes",
            readme: "# Aviation\n\nFlight data docs.",
        });
    });

    it("returns null for an unknown plugin", async () => {
        mockPlugin.findUnique.mockResolvedValueOnce(null);

        const detail = await getPluginById("does-not-exist");

        expect(detail).toBeNull();
    });

    it("returns null for a pending-trust plugin", async () => {
        mockPlugin.findUnique.mockResolvedValueOnce(
            makePlugin({ trust: "pending" }),
        );

        const detail = await getPluginById("aviation");

        expect(detail).toBeNull();
    });

    it("queries npm cache by the plugin's npm package", async () => {
        mockPlugin.findUnique.mockResolvedValueOnce(makePlugin());
        mockNpmCache.findUnique.mockResolvedValueOnce(null);

        await getPluginById("aviation");

        expect(mockNpmCache.findUnique).toHaveBeenCalledWith({
            where: { npmPackage: "@worldwideview/wwv-plugin-aviation" },
        });
    });

    it("tolerates invalid capabilities JSON with an empty array", async () => {
        mockPlugin.findUnique.mockResolvedValueOnce(
            makePlugin({ capabilities: "not-json{{{" }),
        );
        mockNpmCache.findUnique.mockResolvedValueOnce(null);

        const detail = await getPluginById("aviation");

        expect(detail?.capabilities).toEqual([]);
    });

    it("falls back to db fields when npm cache is absent", async () => {
        mockPlugin.findUnique.mockResolvedValueOnce(makePlugin());
        mockNpmCache.findUnique.mockResolvedValueOnce(null);

        const detail = await getPluginById("aviation");

        expect(detail).toMatchObject({
            name: "aviation",
            description: "Real-time flight tracking data feed for the globe.",
            author: "WorldWideView",
            version: "0.0.0",
            tags: [],
            updatedAt: "—",
            repository: undefined,
            readme: undefined,
            changelog: "v1.0.0 initial release",
        });
    });

    it("prefers npm changelog over db changelog", async () => {
        mockPlugin.findUnique.mockResolvedValueOnce(makePlugin());
        mockNpmCache.findUnique.mockResolvedValueOnce(makeCache());

        const detail = await getPluginById("aviation");

        expect(detail?.changelog).toBe("## Changelog\n\n- v1.2.3 fixes");
    });

    it("defaults changelog to empty string when neither source has one", async () => {
        mockPlugin.findUnique.mockResolvedValueOnce(
            makePlugin({ changelog: null }),
        );
        mockNpmCache.findUnique.mockResolvedValueOnce(null);

        const detail = await getPluginById("aviation");

        expect(detail?.changelog).toBe("");
    });
});

describe("searchPlugins", () => {
    it("matches by name, case-insensitively", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const results = await searchPlugins("AVIATION");

        expect(results.map((r) => r.id)).toEqual(["aviation"]);
    });

    it("matches by description substring", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([
            makeCache({ description: "Live aircraft position feed" }),
        ]);

        const results = await searchPlugins("aircraft");

        expect(results.map((r) => r.id)).toEqual(["aviation"]);
    });

    it("matches by tag substring", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([makeCache()]);

        const results = await searchPlugins("flight");

        expect(results.map((r) => r.id)).toEqual(["aviation"]);
    });

    it("returns an empty list when nothing matches", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([makeCache()]);

        const results = await searchPlugins("zzz-no-match");

        expect(results).toEqual([]);
    });

    it("passes the category filter through to getAllPlugins", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([
            makePlugin(),
            makePlugin({ id: "storms", category: "weather" }),
        ]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const results = await searchPlugins("storms", "weather");

        expect(results.map((r) => r.id)).toEqual(["storms"]);
    });
});
