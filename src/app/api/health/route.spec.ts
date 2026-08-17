import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

/** Shape of the mocked NextResponse.json return value in this spec. */
interface MockJsonResponse<TBody> {
    body: TBody;
    init?: { status?: number; headers?: Record<string, string> };
}

interface HealthResponseBody {
    status: "ok" | "degraded";
    checks: { db: boolean };
    timestamp: string;
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

const { mockQueryRaw } = vi.hoisted(() => ({
    mockQueryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        $queryRaw: mockQueryRaw,
    },
}));

describe("Health Endpoint", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 200 with status ok when the DB is reachable", async () => {
        mockQueryRaw.mockResolvedValueOnce([{ "1": 1 }]);

        const res = (await GET()) as unknown as MockJsonResponse<HealthResponseBody>;

        expect(res.init?.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.checks.db).toBe(true);
        expect(typeof res.body.timestamp).toBe("string");
    });

    it("returns 503 with status degraded when the DB check fails", async () => {
        mockQueryRaw.mockRejectedValueOnce(new Error("DB unreachable"));

        const res = (await GET()) as unknown as MockJsonResponse<HealthResponseBody>;

        expect(res.init?.status).toBe(503);
        expect(res.body.status).toBe("degraded");
        expect(res.body.checks.db).toBe(false);
    });

    it("never throws — responds even when the prisma call rejects", async () => {
        mockQueryRaw.mockRejectedValueOnce(new Error("boom"));

        const res = (await GET()) as unknown as MockJsonResponse<HealthResponseBody>;

        expect(res.body.status).toBe("degraded");
    });
});
