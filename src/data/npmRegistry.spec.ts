import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPackageMeta, fetchAllPackageMeta } from "@/data/npmRegistry";

const mockFetch = vi.fn();

function stubFetch(ok: boolean, body: unknown) {
    mockFetch.mockResolvedValueOnce({
        ok,
        json: async () => body,
    });
}

function makeManifest(overrides: Record<string, unknown> = {}) {
    return {
        name: "@worldwideview/wwv-plugin-aviation",
        description: "Aviation data",
        "dist-tags": { latest: "1.2.3" },
        versions: {
            "1.2.3": {
                name: "@worldwideview/wwv-plugin-aviation",
                author: { name: "Jane Doe" },
            },
        },
        author: "Top Level Author",
        keywords: ["flights"],
        time: {
            modified: "2026-07-02T10:00:00.000Z",
            "1.2.3": "2026-07-01T10:00:00.000Z",
        },
        repository: { url: "git+https://github.com/silvertakana/wwv-plugins.git" },
        readme: "## Changelog\n\n- v1.2.3 fixes",
        ...overrides,
    };
}

beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("fetchPackageMeta", () => {
    it("returns full metadata for a package", async () => {
        stubFetch(true, makeManifest());

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta).toEqual({
            name: "@worldwideview/wwv-plugin-aviation",
            description: "Aviation data",
            version: "1.2.3",
            author: "Jane Doe",
            keywords: ["flights"],
            updatedAt: "2026-07-01",
            repository: "https://github.com/silvertakana/wwv-plugins",
            readme: "## Changelog\n\n- v1.2.3 fixes",
            changelog: "- v1.2.3 fixes",
        });
    });

    it("encodes the slash in the package name and disables the cache", async () => {
        stubFetch(true, makeManifest());

        await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(mockFetch).toHaveBeenCalledWith(
            "https://registry.npmjs.org/@worldwideview%2Fwwv-plugin-aviation",
            { cache: "no-store" },
        );
    });

    it("returns null when the registry responds with a non-ok status", async () => {
        stubFetch(false, {});

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-missing");

        expect(meta).toBeNull();
    });

    it("returns null when the network request rejects", async () => {
        mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta).toBeNull();
    });

    it("returns null when the response body is not valid JSON", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => {
                throw new SyntaxError("Unexpected token");
            },
        });

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta).toBeNull();
    });

    it("falls back to version 0.0.0 when dist-tags.latest is missing", async () => {
        stubFetch(true, makeManifest({ "dist-tags": {} }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.version).toBe("0.0.0");
    });

    it("prefers time[latest] over time.modified for updatedAt", async () => {
        stubFetch(true, makeManifest());

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.updatedAt).toBe("2026-07-01");
    });

    it("falls back to time.modified for updatedAt when latest has no timestamp", async () => {
        stubFetch(true, makeManifest({ time: { modified: "2026-07-02T10:00:00.000Z" } }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.updatedAt).toBe("2026-07-02");
    });

    it("falls back to today's date when no time data exists", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-16T12:00:00.000Z"));
        stubFetch(true, makeManifest({ time: undefined }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.updatedAt).toBe("2026-08-16");
    });

    it("extracts a string author", async () => {
        stubFetch(true, makeManifest({ author: "Jane Doe", versions: {} }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.author).toBe("Jane Doe");
    });

    it("extracts an object author name", async () => {
        stubFetch(true, makeManifest());

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.author).toBe("Jane Doe");
    });

    it("prefers the author from the latest version over the top-level author", async () => {
        stubFetch(true, makeManifest());

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.author).toBe("Jane Doe");
    });

    it("does not consult the top-level author when the latest version exists without one", async () => {
        // extractAuthor(latestVersion ?? json): the version object exists (no
        // author), so the top-level json.author is never reached — WorldWideView wins.
        stubFetch(true, makeManifest({
            versions: { "1.2.3": { name: "@worldwideview/wwv-plugin-aviation" } },
        }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.author).toBe("WorldWideView");
    });

    it("falls back to top-level author when the latest tag has no version entry", async () => {
        stubFetch(true, makeManifest({ versions: {} }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.author).toBe("Top Level Author");
    });

    it("defaults author to WorldWideView when author is missing", async () => {
        stubFetch(true, makeManifest({ author: undefined, versions: {} }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.author).toBe("WorldWideView");
    });

    it("defaults author to WorldWideView when the author object has no name", async () => {
        stubFetch(true, makeManifest({ author: { email: "jane@example.com" }, versions: {} }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.author).toBe("WorldWideView");
    });

    it("strips git+ prefix and .git suffix from the repository url", async () => {
        stubFetch(true, makeManifest());

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.repository).toBe("https://github.com/silvertakana/wwv-plugins");
    });

    it("leaves an already-clean repository url untouched", async () => {
        stubFetch(true, makeManifest({
            repository: { url: "https://github.com/silvertakana/wwv-plugins" },
        }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.repository).toBe("https://github.com/silvertakana/wwv-plugins");
    });

    it("leaves repository undefined when absent", async () => {
        stubFetch(true, makeManifest({ repository: undefined }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.repository).toBeUndefined();
    });

    it("extracts the changelog section from the readme", async () => {
        stubFetch(true, makeManifest());

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.changelog).toBe("- v1.2.3 fixes");
    });

    it("stops the changelog at the next markdown heading", async () => {
        stubFetch(true, makeManifest({
            readme: "## Changelog\n\n- v1.2.3 fixes\n\n## Usage\n\nInstall it.",
        }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.changelog).toBe("- v1.2.3 fixes");
    });

    it("returns undefined changelog when the readme has no changelog section", async () => {
        stubFetch(true, makeManifest({ readme: "# Aviation\n\nJust docs." }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.changelog).toBeUndefined();
    });

    it("returns undefined changelog when the changelog heading is empty", async () => {
        stubFetch(true, makeManifest({ readme: "## Changelog" }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.changelog).toBeUndefined();
    });

    it("returns undefined readme and changelog when readme is absent", async () => {
        stubFetch(true, makeManifest({ readme: undefined }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.readme).toBeUndefined();
        expect(meta?.changelog).toBeUndefined();
    });

    it("falls back to the requested package name when json.name is missing", async () => {
        stubFetch(true, makeManifest({ name: undefined }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.name).toBe("@worldwideview/wwv-plugin-aviation");
    });

    it("defaults description to an empty string when missing", async () => {
        stubFetch(true, makeManifest({ description: undefined }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.description).toBe("");
    });

    it("defaults keywords to an empty array when missing", async () => {
        stubFetch(true, makeManifest({ keywords: undefined }));

        const meta = await fetchPackageMeta("@worldwideview/wwv-plugin-aviation");

        expect(meta?.keywords).toEqual([]);
    });
});

describe("fetchAllPackageMeta", () => {
    it("returns a map of all successfully fetched packages", async () => {
        stubFetch(true, makeManifest());
        stubFetch(true, makeManifest({ name: "@worldwideview/wwv-plugin-storms" }));

        const map = await fetchAllPackageMeta([
            "@worldwideview/wwv-plugin-aviation",
            "@worldwideview/wwv-plugin-storms",
        ]);

        expect(map.size).toBe(2);
        expect(map.get("@worldwideview/wwv-plugin-aviation")?.version).toBe("1.2.3");
        expect(map.get("@worldwideview/wwv-plugin-storms")?.name).toBe("@worldwideview/wwv-plugin-storms");
    });

    it("skips packages that fail to resolve", async () => {
        stubFetch(false, {});

        const map = await fetchAllPackageMeta([
            "@worldwideview/wwv-plugin-missing",
        ]);

        expect(map.size).toBe(0);
    });

    it("skips packages whose fetch rejects", async () => {
        mockFetch.mockRejectedValueOnce(new Error("ETIMEDOUT"));
        stubFetch(true, makeManifest());

        const map = await fetchAllPackageMeta([
            "@worldwideview/wwv-plugin-broken",
            "@worldwideview/wwv-plugin-aviation",
        ]);

        expect(map.size).toBe(1);
        expect(map.get("@worldwideview/wwv-plugin-aviation")).toBeDefined();
        expect(map.get("@worldwideview/wwv-plugin-broken")).toBeUndefined();
    });
});
