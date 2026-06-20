import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as jose from 'jose'

const TEST_SECRET = 'marketplace-connect-test-secret-123'
const TEST_USER_ID = 'supabase-uuid-abc-123'

const mockFindUnique = vi.hoisted(() => vi.fn())
const mockIssueApiKey = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: mockFindUnique,
        },
    },
}))

vi.mock('@/lib/auth/apiKeyIssuance', () => ({
    issueApiKey: mockIssueApiKey,
}))

async function signTestJwt(sub: string, secret: string, opts?: { expired?: boolean }): Promise<string> {
    const enc = new TextEncoder().encode(secret)
    const now = Math.floor(Date.now() / 1000)
    const exp = opts?.expired ? now - 60 : now + 60
    return new jose.SignJWT({ sub })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(sub)
        .setIssuedAt(now - 120)
        .setExpirationTime(exp)
        .sign(enc)
}

import { POST } from './route'

beforeEach(() => {
    process.env.MARKETPLACE_CONNECT_SECRET = TEST_SECRET
    mockFindUnique.mockReset()
    mockIssueApiKey.mockReset()
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('POST /api/connect/direct', () => {
    it('returns 200 + apiKey for valid JWT with existing user', async () => {
        const token = await signTestJwt(TEST_USER_ID, TEST_SECRET)

        mockFindUnique.mockResolvedValue({ id: 'user-1', supabaseUserId: TEST_USER_ID, email: 'test@test.com' })
        mockIssueApiKey.mockResolvedValue({ apiKey: 'mk_test_key_123' })

        const req = new Request('http://localhost:3002/api/connect/direct', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        })
        const res = await POST(req)
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.apiKey).toBe('mk_test_key_123')
    })

    it('returns 404 when user not found', async () => {
        const token = await signTestJwt('nonexistent-uuid', TEST_SECRET)

        mockFindUnique.mockResolvedValue(null)

        const req = new Request('http://localhost:3002/api/connect/direct', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        })
        const res = await POST(req)
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.error).toBe('user_not_found')
    })

    it('returns 401 for expired JWT', async () => {
        const token = await signTestJwt(TEST_USER_ID, TEST_SECRET, { expired: true })

        const req = new Request('http://localhost:3002/api/connect/direct', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        })
        const res = await POST(req)
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('token_expired')
    })

    it('returns 401 for JWT signed with wrong secret', async () => {
        const token = await signTestJwt(TEST_USER_ID, 'wrong-secret')

        const req = new Request('http://localhost:3002/api/connect/direct', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        })
        const res = await POST(req)
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('invalid_token')
    })

    it('returns 401 for missing Authorization header', async () => {
        const req = new Request('http://localhost:3002/api/connect/direct', {
            method: 'POST',
        })
        const res = await POST(req)
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('missing_token')
    })

    it('returns 401 for malformed JWT', async () => {
        const req = new Request('http://localhost:3002/api/connect/direct', {
            method: 'POST',
            headers: { Authorization: 'Bearer not-a-valid-jwt' },
        })
        const res = await POST(req)
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('invalid_token')
    })
})
