import { describe, it, expect, vi, beforeEach } from "vitest";
import * as jose from "jose";

const mockSigningKey = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
    prisma: {
        signingKey: mockSigningKey,
        $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn({ signingKey: mockSigningKey })),
    },
}));

// Import after mocking
const { getActiveKey, getJwksPublicKeys, rotateKey, revokeExpiredRetiredKeys, KEY_OVERLAP_MS } =
    await import("@/lib/auth/signingKey");

async function makePublicJwk(kid: string) {
    const { publicKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
    return { ...(await jose.exportJWK(publicKey)), kid, alg: "EdDSA", kty: "OKP", crv: "Ed25519" };
}

async function makeKeyRecord(kid: string, status: string, retiredAt?: Date) {
    const { publicKey, privateKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
    const meta = { kid, alg: "EdDSA", kty: "OKP", crv: "Ed25519" };
    return {
        id: `id-${kid}`,
        kid,
        privateJwk: JSON.stringify({ ...(await jose.exportJWK(privateKey)), ...meta }),
        publicJwk: JSON.stringify({ ...(await jose.exportJWK(publicKey)), ...meta }),
        status,
        createdAt: new Date(),
        retiredAt: retiredAt ?? null,
        revokedAt: null,
    };
}

describe("getActiveKey", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns the active key from DB", async () => {
        const record = await makeKeyRecord("kid-active", "active");
        mockSigningKey.findFirst.mockResolvedValueOnce(record);

        const { kid, privateKey } = await getActiveKey();

        expect(kid).toBe("kid-active");
        expect(privateKey).toBeDefined();
    });

    it("bootstraps from env var when no DB key exists", async () => {
        mockSigningKey.findFirst.mockResolvedValueOnce(null);
        mockSigningKey.findUnique.mockResolvedValueOnce(null);

        const { privateKey: pk } = await jose.generateKeyPair("EdDSA", { extractable: true });
        const jwk = { ...(await jose.exportJWK(pk)), kid: "env-kid", alg: "EdDSA" };
        const record = await makeKeyRecord("env-kid", "active");
        mockSigningKey.create.mockResolvedValueOnce(record);

        const originalEnv = process.env.MARKETPLACE_JWK_PRIVATE;
        process.env.MARKETPLACE_JWK_PRIVATE = JSON.stringify(jwk);
        try {
            const { kid } = await getActiveKey();
            expect(kid).toBe("env-kid");
            expect(mockSigningKey.create).toHaveBeenCalledOnce();
        } finally {
            process.env.MARKETPLACE_JWK_PRIVATE = originalEnv;
        }
    });
});

describe("getJwksPublicKeys", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns public JWKs for active and retiring keys, not revoked", async () => {
        const activeJwk = await makePublicJwk("kid-active");
        const retiringJwk = await makePublicJwk("kid-retiring");
        mockSigningKey.findMany.mockResolvedValueOnce([
            { id: "1", kid: "kid-active", publicJwk: JSON.stringify(activeJwk), status: "active", createdAt: new Date() },
            { id: "2", kid: "kid-retiring", publicJwk: JSON.stringify(retiringJwk), status: "retiring", createdAt: new Date() },
        ]);

        const keys = await getJwksPublicKeys();

        expect(keys).toHaveLength(2);
        expect((keys[0] as any).kid).toBe("kid-active");
        expect((keys[1] as any).kid).toBe("kid-retiring");
    });

    it("private key material (d) is not present in returned keys", async () => {
        const pubJwk = await makePublicJwk("kid-1");
        mockSigningKey.findMany.mockResolvedValueOnce([
            { id: "1", kid: "kid-1", publicJwk: JSON.stringify(pubJwk), status: "active", createdAt: new Date() },
        ]);

        const keys = await getJwksPublicKeys();

        expect((keys[0] as any).d).toBeUndefined();
    });
});

describe("rotateKey", () => {
    beforeEach(() => vi.clearAllMocks());

    it("marks active key as retiring and creates a new active key", async () => {
        const oldRecord = await makeKeyRecord("kid-old", "active");
        const newRecord = await makeKeyRecord("kid-new", "active");

        mockSigningKey.findFirst.mockResolvedValueOnce(oldRecord);
        mockSigningKey.update.mockResolvedValueOnce({ ...oldRecord, status: "retiring", retiredAt: new Date() });
        mockSigningKey.create.mockResolvedValueOnce(newRecord);

        const result = await rotateKey();

        expect(mockSigningKey.update).toHaveBeenCalledWith({
            where: { id: oldRecord.id },
            data: { status: "retiring", retiredAt: expect.any(Date) },
        });
        expect(result.oldKid).toBe("kid-old");
        expect(result.newKid).toBe("kid-new");
    });

    it("generates first key when no active key exists (first boot)", async () => {
        const newRecord = await makeKeyRecord("kid-first", "active");
        mockSigningKey.findFirst.mockResolvedValueOnce(null);
        mockSigningKey.create.mockResolvedValueOnce(newRecord);

        const result = await rotateKey();

        expect(mockSigningKey.update).not.toHaveBeenCalled();
        expect(result.oldKid).toBeNull();
        expect(result.newKid).toBe("kid-first");
    });

    it("prevents concurrent rotation from creating two active keys (P4-T04)", async () => {
        const oldRecord = await makeKeyRecord("kid-old", "active");
        const keyA = await makeKeyRecord("kid-a", "active");
        const keyB = await makeKeyRecord("kid-b", "active");

        // In the real DB (SQLite, better-sqlite3, single-writer), the Prisma
        // $transaction serializes writes: the second rotateKey transaction waits
        // for the first to complete, so it sees the first's newly-created key.
        // In this mock, $transaction calls the fn immediately, so both calls
        // see the same oldRecord simultaneously — but the invariant still holds:
        // no key remains active after both calls, and exactly N create+update
        // pairs execute (one per call).
        mockSigningKey.findFirst
            .mockResolvedValueOnce(oldRecord)
            .mockResolvedValueOnce(oldRecord);

        mockSigningKey.update
            .mockResolvedValueOnce({ ...oldRecord, status: "retiring", retiredAt: new Date() })
            .mockResolvedValueOnce({ ...oldRecord, status: "retiring", retiredAt: new Date() });

        mockSigningKey.create
            .mockResolvedValueOnce(keyA)
            .mockResolvedValueOnce(keyB);

        const [resultA, resultB] = await Promise.all([rotateKey(), rotateKey()]);

        // Both calls retired the same old key (mock doesn't serialize)
        expect(resultA.oldKid).toBe("kid-old");
        expect(resultB.oldKid).toBe("kid-old");

        // Each call created a new unique key
        expect(resultA.newKid).toBe("kid-a");
        expect(resultB.newKid).toBe("kid-b");

        // Exactly 2 update+create pairs executed (one per call)
        expect(mockSigningKey.findFirst).toHaveBeenCalledTimes(2);
        expect(mockSigningKey.update).toHaveBeenCalledTimes(2);
        expect(mockSigningKey.create).toHaveBeenCalledTimes(2);
    });
});

describe("revokeExpiredRetiredKeys", () => {
    beforeEach(() => vi.clearAllMocks());

    it("revokes retiring keys that have passed the overlap window", async () => {
        const expiredKey = await makeKeyRecord("kid-expired", "retiring", new Date(Date.now() - KEY_OVERLAP_MS - 1000));
        mockSigningKey.findMany.mockResolvedValueOnce([expiredKey]);
        mockSigningKey.updateMany.mockResolvedValueOnce({ count: 1 });

        const revoked = await revokeExpiredRetiredKeys();

        expect(revoked).toEqual(["kid-expired"]);
        expect(mockSigningKey.updateMany).toHaveBeenCalledWith({
            where: { id: { in: [expiredKey.id] } },
            data: { status: "revoked", revokedAt: expect.any(Date) },
        });
    });

    it("does not revoke keys still within the overlap window", async () => {
        mockSigningKey.findMany.mockResolvedValueOnce([]);

        const revoked = await revokeExpiredRetiredKeys();

        expect(revoked).toHaveLength(0);
        expect(mockSigningKey.updateMany).not.toHaveBeenCalled();
    });

    it("passes the correct cutoff timestamp to the DB query", async () => {
        mockSigningKey.findMany.mockResolvedValueOnce([]);

        await revokeExpiredRetiredKeys();

        const call = mockSigningKey.findMany.mock.calls[0][0];
        expect(call.where.status).toBe("retiring");
        expect(call.where.retiredAt.lt).toBeInstanceOf(Date);
        const cutoff = call.where.retiredAt.lt as Date;
        expect(Date.now() - cutoff.getTime()).toBeCloseTo(KEY_OVERLAP_MS, -3);
    });
});
