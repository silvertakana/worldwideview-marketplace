# Decentralized Plugin Authentication - Marketplace Phase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. 

**Goal:** Create the token issuance and JWKS endpoints securely.
**Repository:** `C:\dev\worldwideview-marketplace`
**Tech Stack:** Next.js, `jose`.

## Global Directives
1. **Strict Types:** Import `TokenExchangeRequest` and `SensitiveString` from `@worldwideview/wwv-plugin-sdk/src/auth-contracts.ts`.
2. **Security Branding:** All long-lived secrets must use the `SensitiveString` type via `sensitive(str)`.
3. **TDD Mandatory:** Write failing tests (`vitest`) before implementing features.

---

## Task 2.1: Persistent JWKS Endpoint & Ed25519 Keys
**Files:**
- Create: `src/app/api/auth/jwks/route.ts`
- Create: `src/lib/auth/keys.ts`

- [ ] **Step 1: Write failing tests** ensuring keys are loaded from env, not generated at runtime.
- [ ] **Step 2: Implement Key Loader**: Load Ed25519 private key from environment `MARKETPLACE_JWK_PRIVATE` (base64url encoded JWK format) and `MARKETPLACE_JWK_KID`.
- [ ] **Step 3: Implement JWKS Endpoint** returning the public key, with proper `Cache-Control` headers and key rotation overlap support.

## Task 2.2: Token Exchange Endpoint
**Files:**
- Create: `src/app/api/auth/exchange/route.ts`

- [ ] **Step 1: Write failing test** (given an API key and audience, returns a signed 5-minute JWT).
- [ ] **Step 2: Implement Token Exchange**: Verify API key, construct JWT with EXACT claims: `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`, `tier`, and `scope` (entitlements). Sign with `jose` using EdDSA. Allow 60s leeway for clock drift in generation if necessary. Implement fallback to PostgreSQL for ticket issuance if Redis is down.

---

## Pre-Mortem Mitigations (Context)
- **Incomplete JWT Claims:** Ensure `scope` is added to the claims payload exactly as ADR-001 requires.
- **Clock Drift:** Implement 60s leeway on `nbf` and `exp`.
- **Redis Outage:** Ensure Postgres fallback exists.
