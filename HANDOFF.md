# ADR-001 Handoff — Marketplace (Workstream A)

## What this branch is for

Hardening the Marketplace's existing (but stubbed) JWT ticket infrastructure to production quality.
Branch: `feat/adr-001-marketplace` | Repo: `c:\dev\worldwideview-marketplace`
Master plan: `C:\Users\silve\.claude\plans\i-want-you-to-delightful-candle.md`

## Current state (read this first — more done than you'd think)

Two endpoints already exist on `main` from a prior attempt:
- `src/app/api/auth/jwks/route.ts` — JWKS endpoint using Ed25519 from `MARKETPLACE_JWK_PRIVATE` env var. **Bug:** `Cache-Control: max-age=86400` should be `max-age=300`.
- `src/app/api/auth/exchange/route.ts` — Token exchange endpoint, EdDSA-signed 5-min JWT. **Bugs:** stub `apiKey` check (`"valid-key-for-testing"`), hardcoded `aud: "wwv-data-engines"`, stub `sub`, `tier`, `scope`.

The Ed25519 keypair is stored as a JSON JWK in the `MARKETPLACE_JWK_PRIVATE` env var. The library (`jose`) is already installed.

## What's on the previous broken branch

`feat/docs-redirect` has an older version of this work merged in. **Do not cherry-pick from it** — use the current `main` as the baseline (already on this branch). The current `main` version is cleaner.

## Tasks in order

### A1-A2 — Fix existing JWKS endpoint (no new files, just fix bugs)

1. **`src/app/api/auth/jwks/route.ts`** — Fix cache header:
   ```ts
   "Cache-Control": "public, max-age=300, stale-while-revalidate=60"
   ```
   5 minutes max-age matches the 5-minute JWT expiry window from ADR-001.

2. **`src/app/api/auth/jwks/route.ts`** — Support multi-key array for key rotation. Currently returns `{ keys: [publicJwk] }`. Keep this structure but ensure the `kid` field is always present in the JWK (it must match the `kid` in issued JWT headers for `get-jwks` to find it).

### A3 — Harden the token exchange endpoint

3. **`src/app/api/auth/exchange/route.ts`** — Replace `apiKey !== "valid-key-for-testing"` with a real DB lookup:
   - Query the database for a `MarketplaceApiKey` record matching `apiKey`.
   - Load the associated user's `id`, `tier`, and `scope`.
   - If not found → 401.

4. **`src/app/api/auth/exchange/route.ts`** — Fix stub values:
   - `sub`: real `userId` from DB.
   - `aud`: accept `audience` from the request body (`{ apiKey, audience, plugin_id }`). Use this as the JWT `aud` claim. Default to `"wwv-data-engine"` if not provided (for backwards compat during migration).
   - `tier`: real tier from user subscription (query DB).
   - `scope`: derive from subscription tier.

5. **`src/app/api/auth/exchange/route.ts`** — Add body schema:
   ```ts
   const { apiKey, audience, plugin_id } = body;
   ```

6. Update spec file `src/app/api/auth/exchange/route.spec.ts` to test the real DB path (mock Prisma).

### A4 — PKCE token endpoint / API-Key concept (this is the larger new chunk)

**Context:** The Local App PKCE callback (`src/app/api/marketplace/callback/route.ts:27` in the worldwideview repo) expects a `POST /api/oauth/token` endpoint that exchanges an OAuth authorization code for a long-lived API Key. This endpoint does not exist yet on the Marketplace. The API Key is the long-lived credential the Local App stores (encrypted) and uses to request 5-min JWT tickets.

7. **New DB table: `MarketplaceApiKey`**
   - `id`, `userId`, `keyHash` (bcrypt of the raw key), `deviceId`, `createdAt`, `lastUsedAt`, `revokedAt`.
   - Consider adding `name` (user-given label like "Home Server").
   - The raw key is only returned once at issuance; only the hash is stored.

8. **New: `POST /api/oauth/token`** — Called by Local App with `{ code, code_verifier, redirect_uri }`:
   - Validate the PKCE `code_verifier` against the stored `code_challenge` (use `openid-client` or `jose`).
   - If valid, issue a new `MarketplaceApiKey` (random 32 bytes, hex-encoded), store its hash.
   - Return `{ api_key: "<raw key>", expires_in: null }` (never expires, device-bound).

9. **API-Key rotation UI** — A page or modal in the Marketplace where users can see their active API Keys (by device name), revoke individual keys, or rotate. Scope: list, revoke, and issue one per click. Keep it simple.

## Env vars used

| Var | Purpose |
|---|---|
| `MARKETPLACE_JWK_PRIVATE` | JSON string of Ed25519 private JWK. Must have a `kid` field. |
| `DATABASE_URL` | Prisma connection string for MarketplaceApiKey table. |

## Key files

| File | Task |
|---|---|
| `src/app/api/auth/jwks/route.ts` | A1-A2: Fix cache TTL, ensure `kid` present |
| `src/app/api/auth/exchange/route.ts` | A3: Replace stubs with real DB + per-engine `aud` |
| `src/app/api/auth/exchange/route.spec.ts` | A3: Update tests |
| `prisma/schema.prisma` | A4: Add `MarketplaceApiKey` model |
| `src/app/api/oauth/token/route.ts` | A4: **new** PKCE token endpoint |

## Generating an Ed25519 keypair for `MARKETPLACE_JWK_PRIVATE`

If not already generated, run in a Node REPL or script:
```ts
import { generateKeyPair, exportJWK } from 'jose';
const { privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
const jwk = await exportJWK(privateKey);
jwk.kid = 'marketplace-key-v1'; // Required — get-jwks uses kid to cache
jwk.alg = 'EdDSA';
console.log(JSON.stringify(jwk));
```
Store the output as `MARKETPLACE_JWK_PRIVATE` in your env. **Never commit it.**

## Verification

1. `GET /api/auth/jwks` → returns `{ keys: [{ kty, crv, x, kid, alg }] }` (no `d`). Cache-Control is `max-age=300`.
2. `POST /api/auth/exchange` with a real API key → returns `{ token }` (5-min JWT with correct `iss`, `sub`, `aud`, `exp`, `jti`, `tier`, `scope`).
3. `POST /api/auth/exchange` with `"valid-key-for-testing"` → returns 401 (stub removed).
4. Decode the JWT (at jwt.io) and verify `iss: "https://marketplace.worldwideview.dev"` and `exp` is ~5 min in future.
5. `POST /api/oauth/token` with valid PKCE code → returns `{ api_key }`. Store and use it in step 2.
