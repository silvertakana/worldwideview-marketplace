# SECURITY AUDIT -- Phase 4: Marketplace Ed25519 Key Lifecycle + JWKS + OAuth Token Exchange

**Phase:** 4 -- Marketplace Ed25519 Key Lifecycle + JWKS + OAuth Token Exchange
**Audit Mode:** Retroactive-STRIDE (no formal threat model at plan time; register constructed from implementation)
**ASVS Level:** 2
**block_on:** open
**Audit Date:** 2026-05-24
**Closed:** 7/9 | **Open (BLOCKER):** 2/9

---

## Threat Register

### Constructed STRIDE Register

The following threats were identified by reading the implementation files and applying STRIDE analysis to each crypto operation, admin endpoint, and data flow. All dispositions are `mitigate` (no formal `accept` or `transfer` entries exist for this phase).

| Threat ID | STRIDE Category | Description | Disposition | Status |
|-----------|----------------|-------------|-------------|--------|
| P4-T01 | Information Disclosure | Private key exfiltration via logging or API response | mitigate | CLOSED |
| P4-T02 | Tampering | JWT forgery -- keys are not actually EdDSA / `d` leaks into public JWK in generateAndStoreKey path | mitigate | CLOSED |
| P4-T03 | Elevation of Privilege | Unauthorized key rotation -- rotate-key endpoint unprotected when CRON_SECRET unset | mitigate | **OPEN** |
| P4-T04 | Tampering | Key rotation race condition -- two concurrent rotations produce two active keys | mitigate | **OPEN** |
| P4-T05 | Information Disclosure | JWKS endpoint serves both keys during overlap, or caches stale keys | mitigate | CLOSED |
| P4-T06 | Tampering | JWT claims completeness -- ADR-001 required claims absent from issued tokens | mitigate | CLOSED |
| P4-T07 | Information Disclosure | Bootstrap key -- `d` field not stripped from public JWK when bootstrapping from env var | mitigate | CLOSED |
| P4-T08 | Elevation of Privilege | Revocation cron endpoint unprotected when CRON_SECRET unset | mitigate | **OPEN** (same root cause as P4-T03; counted once below) |
| P4-T09 | Information Disclosure | jose importJWK produces extractable key -- private key material extractable from memory | mitigate | CLOSED (accepted residual risk) |

---

## Closed Threats -- Evidence

### P4-T01 -- Private Key Exfiltration via Logging or API Response

**Verification:** No `console.log`, `console.info`, or `console.debug` call referencing `privateJwk` or `privateKey` exists in `signingKey.ts`. The `getJwksPublicKeys()` function reads only the `publicJwk` column and returns `JSON.parse(r.publicJwk)` -- the `privateJwk` DB column is never read in the JWKS or exchange API response paths.

**Evidence:**
- `signingKey.ts` lines 53-66: `getJwksPublicKeys` only accesses `r.publicJwk`, never `r.privateJwk`
- `signingKey.ts` line 48: `privateKey` (CryptoKey object) is returned only to `getActiveKey` callers, never serialised in a response
- `exchange/route.ts` lines 33-48: `privateKey` used only in `.sign(privateKey)`, not logged or returned
- Grep over `src/app/api/` confirms `privateJwk` does not appear in any route handler

**Status: CLOSED**

---

### P4-T02 -- JWT Forgery via Wrong Algorithm or `d` Leaking into Public JWK (generateAndStoreKey path)

**Verification:** Keys are generated with `jose.generateKeyPair("EdDSA", ...)` (signingKey.ts:8). The public JWK is built by calling `jose.exportJWK(publicKey)` on the public half of the pair (signingKey.ts:12). Because `exportJWK` is called on the public key object, the `d` (private exponent) field is never present in `publicJwk` for the code-generated path.

**Evidence:**
- `signingKey.ts` line 8: `const { publicKey, privateKey } = await jose.generateKeyPair("EdDSA", ...)`
- `signingKey.ts` line 12: `jose.exportJWK(publicKey)` -- public key object, not private
- `signingKey.ts` line 11: `jose.exportJWK(privateKey)` stored only in `privateJwk` column
- JWKS endpoint serves `publicJwk` column exclusively (signingKey.ts:65)
- Test `signingKey.spec.ts` line 93-102: explicitly asserts `(keys[0] as any).d` is `undefined`

**Status: CLOSED**

---

### P4-T03 -- Unauthorized Key Rotation (CRON_SECRET unset = endpoint is open)

**Verification:** The protection logic in `rotate-key/route.ts` is conditional:

```
const secret = process.env.CRON_SECRET;
if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
```

When `CRON_SECRET` is not set (the env var is absent or empty), the `if (secret)` branch is skipped entirely and any unauthenticated caller can trigger key rotation. This is not a defence-in-depth gap; it is a **complete bypass of access control** when the env var is unset. In a fresh deployment or misconfigured environment, the rotation endpoint is fully open to the internet. No secondary check (IP allowlist, session auth, Next.js middleware) protects this path.

The test suite (`route.spec.ts` line 26) validates the open-door behavior by deleting `CRON_SECRET` and confirming rotation succeeds with no `Authorization` header -- verifying the bypass is present.

**Status: OPEN (BLOCKER)**

---

### P4-T04 -- Key Rotation Race Condition (two concurrent rotations = two active keys)

**Verification:** `rotateKey()` in `signingKey.ts` executes two sequential Prisma calls with no transaction wrapper and no DB-level uniqueness constraint on `status = "active"`:

1. `prisma.signingKey.update({ where: { id: current.id }, data: { status: "retiring" } })`
2. `generateAndStoreKey()` which calls `prisma.signingKey.create({ data: { ..., status: "active" } })`

Two concurrent callers can both read the same "active" record in step 1, both mark it "retiring", and both then create a new "active" key. The result is two active keys in the DB.

The Prisma schema defines only `@@index([status])` on `SigningKey` -- an index, not a unique constraint. There is no `@@unique([status])` that would prevent multiple rows with `status = "active"`. SQLite does not offer advisory locks or serialisable transactions by default.

Additionally, `getActiveKey()` uses `findFirst({ where: { status: "active" } })` which returns an arbitrary active key when multiple exist, producing non-deterministic signing behaviour.

**Status: OPEN (BLOCKER)**

---

### P4-T05 -- JWKS Serving During Rotation Overlap

**Verification:** `getJwksPublicKeys()` queries `status: { in: ["active", "retiring"] }` -- both keys are served during the overlap window. Cache-Control is set to `public, max-age=300, stale-while-revalidate=60` (jwks/route.ts:9) -- this is a hardcoded HTTP cache hint, but the underlying DB read is live on every non-cached request, so there is no stale-key-only scenario from server state.

**Evidence:**
- `signingKey.ts` lines 54-56: query includes both `"active"` and `"retiring"` statuses
- `jwks/route.ts` line 9: `"Cache-Control": "public, max-age=300, stale-while-revalidate=60"`
- `next.config.ts` lines 5-11: `/.well-known/jwks.json` rewrites to `/api/auth/jwks` -- rewrite is in place

**Status: CLOSED**

---

### P4-T06 -- JWT Claims Completeness

**Verification:** ADR-001 required claims: `iss`, `sub`, `aud`, `exp`, `iat`, `jti`, `tier`, `scope`. All are present.

**Evidence (exchange/route.ts lines 36-48):**
- `tier`: payload line 37 -- `tier: apiKeyRecord.user.tier`
- `scope`: payload line 38 -- `scope: scopeFor(apiKeyRecord.user.tier)`
- `alg + kid`: protected header lines 40 -- `{ alg: "EdDSA", typ: "JWT", kid }`
- `iss`: line 41 -- `setIssuer("https://marketplace.worldwideview.dev")`
- `sub`: line 42 -- `setSubject(apiKeyRecord.userId)`
- `aud`: line 43 -- `setAudience(audience ?? "wwv-data-engine")`
- `exp`: line 44 -- `setExpirationTime(now + 300)` (5-minute window as specified)
- `nbf`: line 45 -- `setNotBefore(now)`
- `iat`: line 46 -- `setIssuedAt(now)`
- `jti`: line 47 -- `setJti(crypto.randomUUID())`

**Status: CLOSED**

---

### P4-T07 -- Bootstrap Key: `d` Not Stripped from Public JWK

**Verification:** The `bootstrapKey()` function correctly strips the private component before storing:

```
const pub = { ...jwk };
delete pub.d;
return prisma.signingKey.create({
    data: { kid: jwk.kid, privateJwk: raw, publicJwk: JSON.stringify(pub), status: "active" },
});
```

`raw` (the full JWK including `d`) is stored in `privateJwk`; `JSON.stringify(pub)` (with `d` deleted) is stored in `publicJwk`.

**Evidence:**
- `signingKey.ts` lines 29-32: explicit `delete pub.d` before `JSON.stringify(pub)`

**Status: CLOSED**

---

### P4-T08 -- Revocation Cron Endpoint Unprotected When CRON_SECRET Unset

**Verification:** `revoke-retired-keys/route.ts` uses the identical conditional guard pattern as `rotate-key/route.ts`:

```
const secret = process.env.CRON_SECRET;
if (secret) { ... }
```

Same bypass as P4-T03 applies. This is the same root cause and is tracked as part of the P4-T03 BLOCKER. Both endpoints share the vulnerability.

**Status: OPEN (BLOCKER -- same root cause as P4-T03)**

---

### P4-T09 -- Private Key Extractable from Memory

**Verification:** `jose.generateKeyPair("EdDSA", { extractable: true })` (signingKey.ts:8) generates a key marked extractable. This means `crypto.subtle.exportKey("jwk", privateKey)` would succeed if the key handle were ever exposed to untrusted code. However:

1. The key handle is not exposed through any response
2. This is an intentional design choice: the key must be extractable to serialise it to the DB via `jose.exportJWK()`
3. Node.js Web Crypto `CryptoKey` objects are not accessible across process boundaries without explicit serialisation

This is an accepted residual risk inherent in any key-rotation-with-persistence design. The alternative (non-extractable keys with HSM-backed storage) is outside scope for this phase.

**Accepted Residual Risk:** Key extractability is required for DB persistence. The risk is bounded by process isolation. No additional mitigation is implemented or warranted at ASVS Level 2.

**Status: CLOSED (accepted residual)**

---

## Open Threats (BLOCKERS)

### P4-T03 / P4-T08: Endpoints Unprotected When CRON_SECRET Is Unset

**Files:**
- `src/app/api/admin/rotate-key/route.ts` lines 5-11
- `src/app/api/cron/revoke-retired-keys/route.ts` lines 5-11

**Pattern not found:** Unconditional access control. Both endpoints skip all auth when `process.env.CRON_SECRET` is falsy.

**Attack scenario:** An attacker who can reach the marketplace URL (no prior auth required) sends `POST /api/admin/rotate-key` with no headers. In an unset-CRON_SECRET deployment, this succeeds, forcing a key rotation that invalidates all currently-valid JWTs and potentially causes a service outage or allows a timing window for crafted tokens.

**Required fix (do not implement here -- implementation files are read-only):** Remove the conditional guard. Either (a) make `CRON_SECRET` a required env var with startup validation that crashes the process if absent, or (b) gate the endpoint on an always-present auth mechanism (NextAuth session with admin role, or a required `Authorization` header regardless of env var state).

---

### P4-T04: No Transaction or DB Unique Constraint Preventing Two Active Keys

**Files:**
- `src/lib/auth/signingKey.ts` lines 72-82 (`rotateKey` function)
- `prisma/schema.prisma` lines 62-73 (`SigningKey` model)

**Pattern not found:** `prisma.$transaction(...)` wrapper around the retire + create steps, OR `@@unique` partial constraint on `status = "active"`.

**Attack scenario:** Under concurrent load (two admin requests, two cron triggers, or a retry during DB lag), two active signing keys enter the DB. `getActiveKey()` uses `findFirst` and returns one non-deterministically. The JWKS endpoint serves both public keys (correct), but signing alternates between the two keys unpredictably. Downstream consumers that cache the `kid` from a previous token may reject tokens signed with the other key.

**Required fix (do not implement here -- implementation files are read-only):** Wrap the `rotateKey` body in `prisma.$transaction(async (tx) => { ... })`. SQLite serialises transactions, which eliminates the race under a single-process deployment. For multi-process, also add a `@@unique` partial index or enforce at-most-one active key via a DB trigger.

---

## Unregistered Flags

No SUMMARY.md was provided for this implementation (retroactive audit). The following attack surface items were identified during code review that did not map to the 9 threats above:

| Flag | File | Description | Recommendation |
|------|------|-------------|----------------|
| UF-01 | `signingKey.ts:8` | `jose.generateKeyPair` called with `extractable: true` -- makes private key serialisable via Web Crypto API | Accepted by design (required for DB persistence); document explicitly |
| UF-02 | `exchange/route.ts:44` | `audience` claim sourced from caller-supplied request body with no allowlist validation -- any string accepted as `aud` | Low severity but a caller can request a token scoped to an arbitrary audience; consider validating `aud` against a known set of service identifiers |
| UF-03 | `signingKey.ts:46-47` | `bootstrapKey()` is called from `getJwksPublicKeys()` -- a public, unauthenticated endpoint -- meaning first-boot key generation can be triggered by an anonymous HTTP request to `/.well-known/jwks.json` | Acceptable for bootstrap, but worth documenting; race possible if two requests hit simultaneously before first key is committed |
| UF-04 | `schema.prisma:67` | `status` field is a free-form `String`, not a DB-level enum -- any value can be written; Prisma does not enforce the comment-documented set | Adds defence-in-depth to validate status transitions in application code |

---

## Accepted Risks Log

| Risk ID | Description | Rationale | Owner |
|---------|-------------|-----------|-------|
| AR-01 | Private key material is stored as plaintext JSON in SQLite `privateJwk` column | SQLite DB file security relies entirely on OS filesystem permissions. No envelope encryption or KMS integration at this phase. Acceptable for Phase 4 scope; should be revisited if the marketplace is deployed to a shared-host environment. | Phase 4 implementer |
| AR-02 | Ed25519 private key generated as extractable (`extractable: true`) | Required by jose to call `exportJWK()` for DB persistence. Key extractability is bounded by process isolation. Mitigation: no route handler exposes the CryptoKey handle or calls exportJWK on the private key outside signingKey.ts. | Phase 4 implementer |

---

## Summary

**Threats Closed:** 7/9
**Threats Open (BLOCKER):** 2 (P4-T03 + P4-T04; P4-T08 shares P4-T03 root cause)

**This phase must not ship in production until P4-T03 and P4-T04 are resolved.** The key rotation and revocation endpoints are publicly accessible when `CRON_SECRET` is not configured, and concurrent rotation calls can produce two active signing keys with no transactional protection.
