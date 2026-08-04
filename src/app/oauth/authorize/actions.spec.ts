import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── mocks ────────────────────────────────────────────────────────────────────
// Note: vi.mock factories are hoisted before const declarations.
// Use vi.fn() inline inside the factory; obtain refs via vi.mocked() after import.

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw { __redirect: url }
  }),
}))

vi.mock('@/lib/auth/requireSession', () => ({
  requireSupabaseUser: vi.fn(),
}))

vi.mock('@/lib/auth/getOrCreateMarketplaceUser', () => ({
  getOrCreateMarketplaceUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    oAuthAuthorizationCode: {
      create: vi.fn(),
    },
  },
}))

// ── imports after mocks ───────────────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'
import { approveAuthorization, denyAuthorization } from './actions'
import { classifyRedirectTier } from '@/lib/redirectTier'

// ── fixtures ──────────────────────────────────────────────────────────────────

const SUPABASE_USER = { id: 'supabase-uuid-123', email: 'user@example.com' }
const MARKETPLACE_USER = { id: 'marketplace-cuid-456', email: 'user@example.com' }

const BASE_FIELDS: Record<string, string> = {
  client_id: 'local-app',
  redirect_uri: 'http://localhost:3000/api/marketplace/callback',
  state: 'random-state-xyz',
  code_challenge: 'abc123challenge',
  code_challenge_method: 'S256',
  scope: 'plugins:read',
}

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  const merged = { ...BASE_FIELDS, ...overrides }
  for (const [k, v] of Object.entries(merged)) fd.set(k, v)
  return fd
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('approveAuthorization', () => {
  const mockRedirect         = vi.mocked(redirect)
  const mockRequire          = vi.mocked(requireSupabaseUser)
  const mockGetOrCreate      = vi.mocked(getOrCreateMarketplaceUser)
  const mockOAuthCreate      = vi.mocked(prisma.oAuthAuthorizationCode.create)

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequire.mockResolvedValue(SUPABASE_USER as never)
    mockGetOrCreate.mockResolvedValue(MARKETPLACE_USER as never)
    mockOAuthCreate.mockResolvedValue({} as never)
    // Default redirect: throw so we can catch and inspect
    mockRedirect.mockImplementation((url: string) => {
      throw { __redirect: url }
    })
  })

  it('rejects non-local-app client_id', async () => {
    await expect(approveAuthorization(makeFormData({ client_id: 'evil-client' }))).rejects.toThrow('unsupported client')
  })

  it('rejects non-S256 code_challenge_method', async () => {
    await expect(approveAuthorization(makeFormData({ code_challenge_method: 'plain' }))).rejects.toThrow('S256 required')
  })

  it('creates OAuth code with 60s TTL', async () => {
    const before = Date.now()

    await expect(approveAuthorization(makeFormData())).rejects.toMatchObject({ __redirect: expect.any(String) })

    expect(mockOAuthCreate).toHaveBeenCalledOnce()
    const createData = mockOAuthCreate.mock.calls[0][0].data
    expect(createData.clientId).toBe('local-app')
    expect(createData.codeChallengeMethod).toBe('S256')
    expect(createData.codeChallenge).toBe(BASE_FIELDS.code_challenge)
    expect(createData.scope).toBe('plugins:read')
    expect(createData.userId).toBe(MARKETPLACE_USER.id)

    const ttlMs = (createData.expiresAt as Date).getTime() - before
    expect(ttlMs).toBeGreaterThanOrEqual(59_000)
    expect(ttlMs).toBeLessThanOrEqual(61_000)
  })

  it('redirects to redirect_uri with code and state params', async () => {
    let captured: string | undefined
    mockRedirect.mockImplementationOnce((url: string) => {
      captured = url
      throw { __redirect: url }
    })

    await expect(approveAuthorization(makeFormData())).rejects.toMatchObject({ __redirect: expect.any(String) })

    const parsed = new URL(captured!)
    expect(parsed.searchParams.get('code')).toBeTruthy()
    expect(parsed.searchParams.get('state')).toBe(BASE_FIELDS.state)
    expect(parsed.origin + parsed.pathname).toBe('http://localhost:3000/api/marketplace/callback')
  })
})

describe('denyAuthorization', () => {
  const mockRedirect = vi.mocked(redirect)

  beforeEach(() => {
    vi.clearAllMocks()
    mockRedirect.mockImplementation((url: string) => {
      throw { __redirect: url }
    })
  })

  it('redirects with error=access_denied and state', async () => {
    let captured: string | undefined
    mockRedirect.mockImplementationOnce((url: string) => {
      captured = url
      throw { __redirect: url }
    })

    const fd = makeFormData()

    await expect(denyAuthorization(fd)).rejects.toMatchObject({ __redirect: expect.any(String) })

    const parsed = new URL(captured!)
    expect(parsed.searchParams.get('error')).toBe('access_denied')
    expect(parsed.searchParams.get('state')).toBe('random-state-xyz')
  })

  it('rejects non-local-app client_id', async () => {
    await expect(denyAuthorization(makeFormData({ client_id: 'evil-client' }))).rejects.toThrow('access_denied')
  })

  it('rejects a rejected redirect URI', async () => {
    await expect(denyAuthorization(makeFormData({ redirect_uri: 'http://evil.example.com/cb' }))).rejects.toThrow('access_denied')
  })
})

describe('classifyRedirectTier', () => {
  beforeEach(() => {
    // Deterministic env: no operator allowlist unless a test stubs it
    vi.stubEnv('OPERATOR_ORIGINS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows http://localhost loopback', () => {
    const result = classifyRedirectTier('http://localhost:3000/api/marketplace/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('loopback')
    expect(result.origin).toBe('http://localhost:3000')
  })

  it('allows http://127.0.0.1 loopback', () => {
    const result = classifyRedirectTier('http://127.0.0.1:4000/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('loopback')
    expect(result.origin).toBe('http://127.0.0.1:4000')
  })

  it('allows operator allowlist match', () => {
    vi.stubEnv('OPERATOR_ORIGINS', 'https://demo.worldwideview.dev, https://app.worldwideview.dev')
    const result = classifyRedirectTier('https://demo.worldwideview.dev/api/marketplace/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('operator')
    expect(result.origin).toBe('https://demo.worldwideview.dev')
  })

  it('rejects operator mismatch (http to a non-loopback host)', () => {
    vi.stubEnv('OPERATOR_ORIGINS', 'https://demo.worldwideview.dev')
    const result = classifyRedirectTier('http://demo.worldwideview.dev/api/marketplace/callback')
    expect(result.allowed).toBe(false)
    expect(result.tier).toBe('rejected')
  })

  it('allows self-hosted https', () => {
    const result = classifyRedirectTier('https://myinstance.example.com/oauth/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('self-hosted')
    expect(result.origin).toBe('https://myinstance.example.com')
  })

  it('rejects self-hosted http', () => {
    const result = classifyRedirectTier('http://myinstance.example.com/oauth/callback')
    expect(result.allowed).toBe(false)
    expect(result.tier).toBe('rejected')
  })

  it('allows wwv:// custom scheme', () => {
    const result = classifyRedirectTier('wwv://oauth/callback')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('loopback')
    expect(result.origin).toBe('')
  })

  it('rejects malformed URIs', () => {
    const result = classifyRedirectTier('not a url')
    expect(result.allowed).toBe(false)
    expect(result.tier).toBe('rejected')
  })

  it('rejects non-http(s) schemes', () => {
    const result = classifyRedirectTier('ftp://example.com/file')
    expect(result.allowed).toBe(false)
    expect(result.tier).toBe('rejected')
  })
})
