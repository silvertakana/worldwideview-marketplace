import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { classifyRedirectTier } from './redirectTier'

describe('classifyRedirectTier (OAUTH_REDIRECT_POLICY flag)', () => {
  beforeEach(() => {
    // Deterministic env: no operator allowlist, policy defaults to v2 (three-tier)
    vi.stubEnv('OPERATOR_ORIGINS', '')
    vi.stubEnv('OAUTH_REDIRECT_POLICY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ── default v2 (three-tier) ────────────────────────────────────────────────
  it('default (v2): allows operator allowlist match', () => {
    vi.stubEnv('OPERATOR_ORIGINS', 'https://demo.worldwideview.dev,https://cloud.worldwideview.dev')
    const result = classifyRedirectTier('https://demo.worldwideview.dev/api/marketplace/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('operator')
    expect(result.origin).toBe('https://demo.worldwideview.dev')
  })

  it('default (v2): allows self-hosted https', () => {
    const result = classifyRedirectTier('https://myinstance.example.com/oauth/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('self-hosted')
    expect(result.origin).toBe('https://myinstance.example.com')
  })

  it('default (v2): still allows loopback', () => {
    const result = classifyRedirectTier('http://localhost:3000/api/marketplace/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('loopback')
  })

  it('default (v2): still allows wwv:// custom scheme', () => {
    const result = classifyRedirectTier('wwv://oauth/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('loopback')
  })

  // ── v1 (legacy loopback-only) ──────────────────────────────────────────────
  it('v1: rejects operator allowlist match', () => {
    vi.stubEnv('OAUTH_REDIRECT_POLICY', 'v1')
    vi.stubEnv('OPERATOR_ORIGINS', 'https://demo.worldwideview.dev')
    const result = classifyRedirectTier('https://demo.worldwideview.dev/api/marketplace/callback')
    expect(result.allowed).toBe(false)
    expect(result.tier).toBe('rejected')
  })

  it('v1: rejects self-hosted https', () => {
    vi.stubEnv('OAUTH_REDIRECT_POLICY', 'v1')
    const result = classifyRedirectTier('https://myinstance.example.com/oauth/callback')
    expect(result.allowed).toBe(false)
    expect(result.tier).toBe('rejected')
  })

  it('v1: still allows loopback', () => {
    vi.stubEnv('OAUTH_REDIRECT_POLICY', 'v1')
    const result = classifyRedirectTier('http://127.0.0.1:4000/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('loopback')
  })

  it('v1: still allows wwv:// custom scheme', () => {
    vi.stubEnv('OAUTH_REDIRECT_POLICY', 'v1')
    const result = classifyRedirectTier('wwv://oauth/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('loopback')
  })
})
