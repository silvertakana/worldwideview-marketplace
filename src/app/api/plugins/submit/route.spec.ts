import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

/** Shape of the mocked NextResponse.json return value in this spec. */
interface MockJsonResponse<TBody> {
    body: TBody;
    init?: { status?: number };
}

interface SubmitPostResponseBody {
    success?: boolean;
    plugin?: { capabilities: string; trust: string };
    error?: string;
}

interface CreateCall {
    data: { capabilities: string; trust: string };
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

const { mockCreate, mockGetSupabaseUser, mockGetOrCreateMarketplaceUser, mockFireWebhook } = vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockGetSupabaseUser: vi.fn(),
    mockGetOrCreateMarketplaceUser: vi.fn(),
    mockFireWebhook: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        plugin: {
            create: mockCreate,
        },
    },
}));

vi.mock("@/lib/auth/requireSession", () => ({
    getSupabaseUser: mockGetSupabaseUser,
    requireSupabaseUser: vi.fn(),
}));

vi.mock("@/lib/auth/getOrCreateMarketplaceUser", () => ({
    getOrCreateMarketplaceUser: mockGetOrCreateMarketplaceUser,
}));

vi.mock("@/lib/webhooks", () => ({
    firePluginSubmitWebhook: mockFireWebhook,
}));

/** npm /latest-style manifest fixture, mirroring a published WWV plugin. */
function manifestFixture(overrides: Record<string, unknown> = {}) {
    return {
        name: "@worldwideview/wwv-plugin-submit-test",
        version: "1.0.0",
        description: "Submit test plugin",
        worldwideview: {
            id: "submit-test",
            icon: "Compass",
            category: "Test",
            format: "bundle",
            capabilities: ["data:own", "globe:overlay", "network:fetch"],
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

function submitRequest(body: unknown) {
    return new Request("http://localhost/api/plugins/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("Plugins Submit POST", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSupabaseUser.mockResolvedValue({
            id: "user-1",
            email: "author@example.com",
            user_metadata: { full_name: "Author" },
        });
        mockGetOrCreateMarketplaceUser.mockResolvedValue({ id: "market-user-1" });
        mockCreate.mockImplementation(({ data }: CreateCall) =>
            Promise.resolve({ ...data, id: "submit-test", addedAt: new Date(), installs: 0 }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("uses capabilities declared in the npm manifest when present", async () => {
        stubFetch(manifestFixture());
        const expected = ["data:own", "globe:overlay", "network:fetch"];

        const res = (await POST(submitRequest({ npmPackage: "@worldwideview/wwv-plugin-submit-test" }))) as unknown as MockJsonResponse<SubmitPostResponseBody>;

        expect(res.body.success).toBe(true);
        expect(res.body.plugin?.trust).toBe("pending");
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ capabilities: JSON.stringify(expected) }),
            }),
        );
    });

    it("falls back to bundle defaults when the manifest declares no capabilities", async () => {
        stubFetch(manifestFixture({ worldwideview: { id: "submit-test", icon: "Compass", category: "Test", format: "bundle" } }));

        const res = (await POST(submitRequest({ npmPackage: "@worldwideview/wwv-plugin-submit-test" }))) as unknown as MockJsonResponse<SubmitPostResponseBody>;

        expect(res.body.success).toBe(true);
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    capabilities: JSON.stringify(["data:own", "network:fetch"]),
                }),
            }),
        );
    });

    it("returns 401 when no session user is present", async () => {
        stubFetch(manifestFixture());
        mockGetSupabaseUser.mockResolvedValueOnce(null);

        const res = (await POST(submitRequest({ npmPackage: "@worldwideview/wwv-plugin-submit-test" }))) as unknown as MockJsonResponse<SubmitPostResponseBody>;

        expect(res.init?.status).toBe(401);
        expect(mockCreate).not.toHaveBeenCalled();
    });
});