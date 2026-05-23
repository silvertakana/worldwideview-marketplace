import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash, randomBytes } from 'node:crypto'
import { POST } from './route'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

function makeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

function makeFormBody(fields: Record<string, string>): Request {
  const form = new URLSearchParams(fields).toString()
  return new Request('http://localhost/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
}

// ── mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((body: unknown, init?: { status?: number }) => ({ body, init })),
    },
  }
})

// vi.mock factories are hoisted — use vi.fn() inline; grab refs via vi.mocked after import
vi.mock('@/lib/prisma', () => ({
  prisma: {
    oAuthAuthorizationCode: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    marketplaceApiKey: {
      create: vi.fn(),
    },
  },
}))

// ── import after mocks (gets the mocked module) ───────────────────────────────

import { prisma } from '@/lib/prisma'

// ── constants ─────────────────────────────────────────────────────────────────

const STORED_CODE = 'test-code-abc123'
const STORED_USER_ID = 'user-xyz'
const VERIFIER = makeVerifier()
const CHALLENGE = makeChallenge(VERIFIER)

const VALID_FIELDS = {
  grant_type: 'authorization_code',
  client_id: 'local-app',
  code: STORED_CODE,
  code_verifier: VERIFIER,
  redirect_uri: 'http://localhost:3000/api/marketplace/callback',
}

function makeStoredCode(overrides: Partial<{
  code: string
  codeChallenge: string
  codeChallengeMethod: string
  clientId: string
  redirectUri: string
  scope: string
  userId: string
  expiresAt: Date
}> = {}) {
  return {
    code: STORED_CODE,
    codeChallenge: CHALLENGE,
    codeChallengeMethod: 'S256',
    clientId: 'local-app',
    redirectUri: 'http://localhost:3000/api/marketplace/callback',
    scope: 'plugins:read',
    userId: STORED_USER_ID,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  }
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('POST /api/oauth/token', () => {
  const findUnique = vi.mocked(prisma.oAuthAuthorizationCode.findUnique)
  const deleteCode = vi.mocked(prisma.oAuthAuthorizationCode.delete)
  const createKey  = vi.mocked(prisma.marketplaceApiKey.create)

  beforeEach(() => {
    vi.clearAllMocks()
    createKey.mockResolvedValue({} as never)
  })

  it('valid code + matching verifier → 200, access_token returned, code deleted', async () => {
    findUnique.mockResolvedValueOnce(makeStoredCode() as never)
    deleteCode.mockResolvedValueOnce({} as never)

    const res: any = await POST(makeFormBody(VALID_FIELDS))

    expect(res.init).toBeUndefined() // no explicit status → 200
    expect(res.body.access_token).toBeDefined()
    expect(res.body.access_token).toMatch(/^mk_/)
    expect(res.body.token_type).toBe('Bearer')
    expect(deleteCode).toHaveBeenCalledWith({ where: { code: STORED_CODE } })
  })

  it('mismatched verifier → 400 invalid_grant, code still deleted (single-use)', async () => {
    findUnique.mockResolvedValueOnce(makeStoredCode() as never)
    deleteCode.mockResolvedValueOnce({} as never)

    const res: any = await POST(makeFormBody({ ...VALID_FIELDS, code_verifier: 'wrong-verifier' }))

    expect(res.init?.status).toBe(400)
    expect(res.body.error).toBe('invalid_grant')
    // Code must still be deleted — single-use guarantee
    expect(deleteCode).toHaveBeenCalledWith({ where: { code: STORED_CODE } })
  })

  it('expired code → 400 invalid_grant', async () => {
    findUnique.mockResolvedValueOnce(makeStoredCode({ expiresAt: new Date(Date.now() - 1000) }) as never)
    deleteCode.mockResolvedValueOnce({} as never)

    const res: any = await POST(makeFormBody(VALID_FIELDS))

    expect(res.init?.status).toBe(400)
    expect(res.body.error).toBe('invalid_grant')
    expect(res.body.error_description).toBe('code expired')
  })

  it('wrong client_id → 400 invalid_grant', async () => {
    findUnique.mockResolvedValueOnce(makeStoredCode() as never)
    deleteCode.mockResolvedValueOnce({} as never)

    const res: any = await POST(makeFormBody({ ...VALID_FIELDS, client_id: 'evil-client' }))

    expect(res.init?.status).toBe(400)
    expect(res.body.error).toBe('invalid_grant')
    expect(res.body.error_description).toBe('client mismatch')
  })

  it('wrong redirect_uri → 400 invalid_grant', async () => {
    findUnique.mockResolvedValueOnce(makeStoredCode() as never)
    deleteCode.mockResolvedValueOnce({} as never)

    const res: any = await POST(makeFormBody({ ...VALID_FIELDS, redirect_uri: 'http://evil.example.com/callback' }))

    expect(res.init?.status).toBe(400)
    expect(res.body.error).toBe('invalid_grant')
    expect(res.body.error_description).toBe('redirect_uri mismatch')
  })

  it('missing required fields → 400 invalid_request', async () => {
    const res: any = await POST(makeFormBody({ grant_type: 'authorization_code' }))

    expect(res.init?.status).toBe(400)
    expect(res.body.error).toBe('invalid_request')
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('unsupported grant_type → 400 unsupported_grant_type', async () => {
    const res: any = await POST(makeFormBody({ ...VALID_FIELDS, grant_type: 'client_credentials' }))

    expect(res.init?.status).toBe(400)
    expect(res.body.error).toBe('unsupported_grant_type')
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('replay (second call with same code) → 400 invalid_grant (unknown code)', async () => {
    // First call: code found, deleted, token issued
    findUnique.mockResolvedValueOnce(makeStoredCode() as never)
    deleteCode.mockResolvedValueOnce({} as never)
    await POST(makeFormBody(VALID_FIELDS))

    // Second call: code already gone
    findUnique.mockResolvedValueOnce(null)

    const res: any = await POST(makeFormBody(VALID_FIELDS))

    expect(res.init?.status).toBe(400)
    expect(res.body.error).toBe('invalid_grant')
    expect(res.body.error_description).toBe('unknown code')
  })
})
