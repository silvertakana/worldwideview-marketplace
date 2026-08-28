import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Plugin, NpmCache } from "@prisma/client";
import type { PluginCard } from "@/data/types";
import type { PluginListPage } from "@/data/pluginService";

const mockPlugin = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
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

    it("pushes the category filter into the database query", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([
            makePlugin({ id: "storms", category: "weather" }),
        ]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const cards = await getAllPlugins("weather");

        expect(mockPlugin.findMany).toHaveBeenCalledWith({
            where: { trust: { not: "pending" }, category: "weather" },
        });
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


describe("getAllPlugins pagination", () => {
    it("bounds the query with skip/take and counts when a page is requested", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockPlugin.count.mockResolvedValueOnce(120);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const result = await getAllPlugins(undefined, { page: 3 });

        expect(mockPlugin.findMany).toHaveBeenCalledWith({
            where: { trust: { not: "pending" } },
            orderBy: { id: "asc" },
            skip: 100,
            take: 50,
        });
        expect(mockPlugin.count).toHaveBeenCalledWith({
            where: { trust: { not: "pending" } },
        });
        expect(result).toEqual({
            plugins: [expect.objectContaining({ id: "aviation" })],
            page: 3,
            pageSize: 50,
            total: 120,
            totalPages: 3,
        });
    });

    it("honors a custom pageSize", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockPlugin.count.mockResolvedValueOnce(11);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const result = (await getAllPlugins(undefined, {
            page: 2,
            pageSize: 10,
        })) as PluginListPage;

        expect(mockPlugin.findMany).toHaveBeenCalledWith({
            where: { trust: { not: "pending" } },
            orderBy: { id: "asc" },
            skip: 10,
            take: 10,
        });
        expect(result.totalPages).toBe(2);
    });

    it("returns an empty page when the page is beyond the end", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([]);
        mockPlugin.count.mockResolvedValueOnce(5);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const result = (await getAllPlugins(undefined, {
            page: 99,
        })) as PluginListPage;

        expect(result.plugins).toEqual([]);
        expect(result.page).toBe(99);
        expect(result.total).toBe(5);
        expect(result.totalPages).toBe(1);
    });

    it("returns an empty page for an empty registry", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([]);
        mockPlugin.count.mockResolvedValueOnce(0);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const result = (await getAllPlugins(undefined, {
            page: 1,
        })) as PluginListPage;

        expect(result).toEqual({
            plugins: [],
            page: 1,
            pageSize: 50,
            total: 0,
            totalPages: 0,
        });
    });

    it("applies the category filter inside the paged count query", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([]);
        mockPlugin.count.mockResolvedValueOnce(1);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        await getAllPlugins("weather", { page: 1 });

        expect(mockPlugin.count).toHaveBeenCalledWith({
            where: { trust: { not: "pending" }, category: "weather" },
        });
    });
});

describe("searchPlugins", () => {
    function mockSearchFlow(opts: {
        cacheMatches?: Array<{ npmPackage: string }>;
        plugins?: Plugin[];
        mergeCache?: NpmCache[];
    }) {
        mockNpmCache.findMany
            .mockResolvedValueOnce(opts.cacheMatches ?? [])
            .mockResolvedValueOnce(opts.mergeCache ?? []);
        mockPlugin.findMany.mockResolvedValueOnce(opts.plugins ?? []);
        mockPlugin.count.mockResolvedValue((opts.plugins ?? []).length);
    }

    it("pushes the query into a native npm cache OR-contains filter", async () => {
        mockSearchFlow({});

        await searchPlugins("AVIATION");

        expect(mockNpmCache.findMany).toHaveBeenNthCalledWith(1, {
            where: {
                OR: [
                    { name: { contains: "AVIATION" } },
                    { description: { contains: "AVIATION" } },
                    { keywords: { contains: "AVIATION" } },
                ],
            },
            select: { npmPackage: true },
        });
    });

    it("pushes the search into the plugin where-clause", async () => {
        mockSearchFlow({
            cacheMatches: [{ npmPackage: "@worldwideview/wwv-plugin-aviation" }],
        });

        await searchPlugins("aviation");

        expect(mockPlugin.findMany).toHaveBeenCalledWith({
            where: {
                trust: { not: "pending" },
                OR: [
                    {
                        npmPackage: {
                            in: ["@worldwideview/wwv-plugin-aviation"],
                        },
                    },
                    { id: { contains: "aviation" } },
                    { longDescription: { contains: "aviation" } },
                ],
            },
        });
    });

    it("returns merged cards for plugins matched by name", async () => {
        mockSearchFlow({
            cacheMatches: [{ npmPackage: "@worldwideview/wwv-plugin-aviation" }],
            plugins: [makePlugin()],
            mergeCache: [makeCache()],
        });

        const results = (await searchPlugins("aviation")) as PluginCard[];

        expect(results.map((r) => r.id)).toEqual(["aviation"]);
        expect(results[0]).toMatchObject({
            name: "Aviation",
            description: "Live aviation data feed",
            tags: ["flights", "aviation"],
        });
    });

    it("passes the category filter into the plugin where-clause", async () => {
        mockSearchFlow({
            plugins: [makePlugin({ id: "storms", category: "weather" })],
        });

        const results = (await searchPlugins("storms", "weather")) as PluginCard[];

        expect(mockPlugin.findMany).toHaveBeenCalledWith({
            where: {
                trust: { not: "pending" },
                category: "weather",
                OR: [
                    { npmPackage: { in: [] } },
                    { id: { contains: "storms" } },
                    { longDescription: { contains: "storms" } },
                ],
            },
        });
        expect(results.map((r) => r.id)).toEqual(["storms"]);
    });

    it("sends a no-match query through the native filters", async () => {
        mockSearchFlow({});

        const results = await searchPlugins("zzz-no-match");

        // The mocked prisma does not execute the where-clause; what these
        // assertions pin down is that a non-matching query reaches the database
        // as native filters (empty cache matches, empty plugin result).
        expect(mockNpmCache.findMany).toHaveBeenNthCalledWith(1, {
            where: {
                OR: [
                    { name: { contains: "zzz-no-match" } },
                    { description: { contains: "zzz-no-match" } },
                    { keywords: { contains: "zzz-no-match" } },
                ],
            },
            select: { npmPackage: true },
        });
        expect(results).toEqual([]);
    });

    it("delegates an empty query to the unfiltered listing", async () => {
        mockPlugin.findMany.mockResolvedValueOnce([makePlugin()]);
        mockNpmCache.findMany.mockResolvedValueOnce([]);

        const results = await searchPlugins("   ");

        expect(mockNpmCache.findMany).toHaveBeenCalledTimes(1);
        expect(mockPlugin.findMany).toHaveBeenCalledWith({
            where: { trust: { not: "pending" } },
        });
        expect(results).toHaveLength(1);
    });

    it("supports pagination on top of the search filter", async () => {
        mockSearchFlow({ plugins: [makePlugin()] });
        mockPlugin.count.mockResolvedValueOnce(7);

        const result = (await searchPlugins("aviation", undefined, {
            page: 2,
            pageSize: 5,
        })) as PluginListPage;

        expect(mockPlugin.findMany).toHaveBeenCalledWith({
            where: {
                trust: { not: "pending" },
                OR: [
                    { npmPackage: { in: [] } },
                    { id: { contains: "aviation" } },
                    { longDescription: { contains: "aviation" } },
                ],
            },
            orderBy: { id: "asc" },
            skip: 5,
            take: 5,
        });
        expect(result).toEqual({
            plugins: [expect.objectContaining({ id: "aviation" })],
            page: 2,
            pageSize: 5,
            total: 7,
            totalPages: 2,
        });
    });

    it("returns an empty page for a search that matches nothing", async () => {
        mockSearchFlow({});
        mockPlugin.count.mockResolvedValueOnce(0);

        const result = (await searchPlugins("zzz", undefined, {
            page: 1,
        })) as PluginListPage;

        expect(result.plugins).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.totalPages).toBe(0);
    });
});
