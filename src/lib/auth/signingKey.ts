import * as jose from "jose";
import { prisma } from "@/lib/prisma";

/** Keys remain in JWKS as `retiring` for this long before being revoked. */
export const KEY_OVERLAP_MS = 10 * 60 * 1000;

async function generateAndStoreKey() {
    const { publicKey, privateKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
    const kid = crypto.randomUUID();
    const meta = { kid, alg: "EdDSA", kty: "OKP", crv: "Ed25519" } as const;
    const privateJwk = JSON.stringify({ ...(await jose.exportJWK(privateKey)), ...meta });
    const publicJwk = JSON.stringify({ ...(await jose.exportJWK(publicKey)), ...meta });
    return prisma.signingKey.create({ data: { kid, privateJwk, publicJwk, status: "active" } });
}

/**
 * On first boot (no DB key yet), import the MARKETPLACE_JWK_PRIVATE env var as the
 * active key so existing deployments keep working without manual rotation.
 * If the env var key was already retired/revoked, generate a fresh key.
 */
async function bootstrapKey() {
    const raw = process.env.MARKETPLACE_JWK_PRIVATE;
    if (raw) {
        try {
            const jwk = JSON.parse(raw);
            if (jwk.crv === "Ed25519" && jwk.kid && jwk.alg) {
                const existing = await prisma.signingKey.findUnique({ where: { kid: jwk.kid } });
                if (!existing) {
                    const pub = { ...jwk };
                    delete pub.d;
                    return prisma.signingKey.create({
                        data: { kid: jwk.kid, privateJwk: raw, publicJwk: JSON.stringify(pub), status: "active" },
                    });
                }
                if (existing.status === "active") return existing;
            }
        } catch {
            // Malformed env var — fall through to generate fresh key
        }
    }
    return generateAndStoreKey();
}

/** Return the current active signing key. Auto-bootstraps on first call. */
export async function getActiveKey(): Promise<{ kid: string; privateKey: CryptoKey }> {
    let record = await prisma.signingKey.findFirst({ where: { status: "active" } });
    if (!record) record = await bootstrapKey();
    const privateKey = await jose.importJWK(JSON.parse(record.privateJwk), "EdDSA") as CryptoKey;
    return { kid: record.kid, privateKey };
}

/** Return public JWKs for all active + retiring keys (served at the JWKS endpoint). */
export async function getJwksPublicKeys(): Promise<object[]> {
    let records = await prisma.signingKey.findMany({
        where: { status: { in: ["active", "retiring"] } },
        orderBy: { createdAt: "desc" },
    });
    if (records.length === 0) {
        await bootstrapKey();
        records = await prisma.signingKey.findMany({
            where: { status: { in: ["active", "retiring"] } },
            orderBy: { createdAt: "desc" },
        });
    }
    return records.map((r) => JSON.parse(r.publicJwk));
}

/**
 * Rotate: mark current active key as `retiring`, generate a new active key.
 * During the KEY_OVERLAP_MS window, both keys appear in JWKS so in-flight JWTs remain valid.
 */
export async function rotateKey(): Promise<{ oldKid: string | null; newKid: string }> {
    const current = await prisma.signingKey.findFirst({ where: { status: "active" } });
    if (current) {
        await prisma.signingKey.update({
            where: { id: current.id },
            data: { status: "retiring", retiredAt: new Date() },
        });
    }
    const newKey = await generateAndStoreKey();
    return { oldKid: current?.kid ?? null, newKid: newKey.kid };
}

/**
 * Revoke all `retiring` keys that have passed the overlap window.
 * Call from a periodic cron job (every 5 minutes is sufficient).
 * Returns the kids of revoked keys.
 */
export async function revokeExpiredRetiredKeys(): Promise<string[]> {
    const cutoff = new Date(Date.now() - KEY_OVERLAP_MS);
    const expired = await prisma.signingKey.findMany({
        where: { status: "retiring", retiredAt: { lt: cutoff } },
    });
    if (expired.length === 0) return [];
    await prisma.signingKey.updateMany({
        where: { id: { in: expired.map((k) => k.id) } },
        data: { status: "revoked", revokedAt: new Date() },
    });
    return expired.map((k) => k.kid);
}
