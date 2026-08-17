import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

/** Shape of the mocked NextResponse.json return value in this spec. */
interface MockJsonResponse<TBody> {
    body: TBody;
    init?: { status?: number };
}

interface RegistryPostResponseBody {
    plugins?: unknown[];
    errors?: { package: string; error: string }[];
}

interface UpsertCall {
    create: { capabilities: string };
    update: { capabilities: string };
}

vi.mock("next/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next/server")>();
    return {
        ...actual,
        NextResponse: {
            json: vi.fn((body, init) => ({ body, init })),
        },
    };
});

const { mockUpsert } = vi.hoisted(() => ({
    mockUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        plugin: {
            upsert: mockUpsert,
        },
    },
}));

/** npm /latest-style manifest fixture, mirroring a published WWV plugin. */
function manifestFixture(overrides: Record<string, unknown> = {}) {
    return {
        name: "@worldwideview/wwv-plugin-test",
        version: "1.0.0",
        description: "Test plugin",
        worldwideview: {
            id: "test",
            icon: "Map",
            category: "Test",
            format: "bundle",
            capabilities: ["data:own", "ui:sidebar", "network:fetch"],
            ...overrides,
        },
        ...(overrides as Record<string, unknown>),
    };
}

function stubFetch(manifest: unknown) {
    vi.stubGlobal(
        "fetch",
        vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(manifest),
            }),
        ),
    );
}

function adminRequest(body: unknown, token = "test-admin-password") {
    return new NextRequest("http://localhost/api/admin/registry", {
        method: "POST",
        headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
        },
        body: JSON.stringify(body),
    });
}

describe("Admin Registry POST", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ADMIN_PASSWORD = "test-admin-password";
        mockUpsert.mockImplementation(({ create }: UpsertCall) =>
            Promise.resolve({ ...create, addedAt: new Date(), installs: 0 }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.ADMIN_PASSWORD;
    });

    it("uses capabilities declared in the npm manifest when present", async () => {
        stubFetch(manifestFixture());
        const expected = ["data:own", "ui:sidebar", "network:fetch"];

        const res = (await POST(adminRequest({ id: "@worldwideview/wwv-plugin-test" }))) as unknown as MockJsonResponse<RegistryPostResponseBody>;

        expect(res.init?.status).toBe(201);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ capabilities: JSON.stringify(expected) }),
            }),
        );
    });

    it("falls back to bundle defaults when the manifest declares no capabilities", async () => {
        stubFetch(manifestFixture({ worldwideview: { id: "test", icon: "Map", category: "Test", format: "bundle" } }));

        const res = (await POST(adminRequest({ id: "@worldwideview/wwv-plugin-test" }))) as unknown as MockJsonResponse<RegistryPostResponseBody>;

        expect(res.init?.status).toBe(201);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({
                    capabilities: JSON.stringify(["data:own", "network:fetch"]),
                }),
            }),
        );
    });

    it("falls back to data-own-only default for non-bundle formats without declared capabilities", async () => {
        stubFetch(manifestFixture({ worldwideview: { id: "test", icon: "Map", category: "Test", format: "static" } }));

        const res = (await POST(adminRequest({ id: "@worldwideview/wwv-plugin-test" }))) as unknown as MockJsonResponse<RegistryPostResponseBody>;

        expect(res.init?.status).toBe(201);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({
                    capabilities: JSON.stringify(["data:own"]),
                }),
            }),
        );
    });

    it("falls back to defaults when declared capabilities is an empty array", async () => {
        stubFetch(manifestFixture({ worldwideview: { id: "test", icon: "Map", category: "Test", format: "bundle", capabilities: [] } }));

        const res = (await POST(adminRequest({ id: "@worldwideview/wwv-plugin-test" }))) as unknown as MockJsonResponse<RegistryPostResponseBody>;

        expect(res.init?.status).toBe(201);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({
                    capabilities: JSON.stringify(["data:own", "network:fetch"]),
                }),
            }),
        );
    });

    it("falls back to defaults when declared capabilities contains non-string entries", async () => {
        stubFetch(manifestFixture({ worldwideview: { id: "test", icon: "Map", category: "Test", format: "bundle", capabilities: ["data:own", 42] } }));

        const res = (await POST(adminRequest({ id: "@worldwideview/wwv-plugin-test" }))) as unknown as MockJsonResponse<RegistryPostResponseBody>;

        expect(res.init?.status).toBe(201);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({
                    capabilities: JSON.stringify(["data:own", "network:fetch"]),
                }),
            }),
        );
    });

    it("applies the manifest capabilities on update as well as create", async () => {
        stubFetch(manifestFixture());
        const expected = ["data:own", "ui:sidebar", "network:fetch"];

        await POST(adminRequest({ id: "@worldwideview/wwv-plugin-test" }));

        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: expect.objectContaining({ capabilities: JSON.stringify(expected) }),
            }),
        );
    });

    it("returns 401 when the admin password is missing", async () => {
        stubFetch(manifestFixture());
        delete process.env.ADMIN_PASSWORD;

        const res = (await POST(adminRequest({ id: "@worldwideview/wwv-plugin-test" }))) as unknown as MockJsonResponse<RegistryPostResponseBody>;

        expect(res.init?.status).toBe(401);
        expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("returns 401 when the admin password is wrong", async () => {
        stubFetch(manifestFixture());

        const res = (await POST(adminRequest({ id: "@worldwideview/wwv-plugin-test" }, "wrong-password"))) as unknown as MockJsonResponse<RegistryPostResponseBody>;

        expect(res.init?.status).toBe(401);
        expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("reports an error when the package is not found on npm", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(() => Promise.resolve({ ok: false })),
        );

        const res = (await POST(adminRequest({ id: "@worldwideview/wwv-plugin-missing" }))) as unknown as MockJsonResponse<RegistryPostResponseBody>;

        expect(res.init?.status).toBe(201);
        expect(res.body.plugins).toHaveLength(0);
        expect(res.body.errors).toEqual([
            { package: "@worldwideview/wwv-plugin-missing", error: "Not found on NPM" },
        ]);
        expect(mockUpsert).not.toHaveBeenCalled();
    });
});