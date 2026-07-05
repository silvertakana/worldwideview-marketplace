import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock calls MUST appear before any imports that reference these modules (Vitest hoisting)
vi.mock('@/lib/auth/requireSession', () => ({
  getSupabaseUser: vi.fn(),
}))

vi.mock('@/lib/auth/getOrCreateMarketplaceUser', () => ({
  getOrCreateMarketplaceUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    linkedInstance: {
      upsert: vi.fn(),
    },
  },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'

const mockGetSupabaseUser = vi.mocked(getSupabaseUser)
const mockGetOrCreate = vi.mocked(getOrCreateMarketplaceUser)
const mockUpsert = vi.mocked(prisma.linkedInstance.upsert)

function makeLinkRequest(body: unknown, origin = 'https://marketplace.worldwideview.dev') { // lint-url: allow
  return new NextRequest(`${origin}/api/instances/link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/instances/link', () => {
  it('returns 401 for unauthenticated callers', async () => {
    mockGetSupabaseUser.mockResolvedValue(null as never)
    const req = makeLinkRequest({ url: 'http://wwv.local:3000' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('unauthenticated')
  })

  it('calls upsert with userId_url compound key for valid requests', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'supa-abc' } as never)
    mockGetOrCreate.mockResolvedValue({ id: 'mkt-123' } as never)
    mockUpsert.mockResolvedValue({
      id: 'inst-1',
      url: 'http://wwv.local:3000',
      nickname: null,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    } as never)

    const req = makeLinkRequest({ url: 'http://wwv.local:3000/some/path?q=1' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledOnce()
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_url: { userId: 'mkt-123', url: 'http://wwv.local:3000' } },
        create: { userId: 'mkt-123', url: 'http://wwv.local:3000' },
        update: { lastUsedAt: expect.any(Date) },
      }),
    )
    const body = await res.json()
    expect(body.instance).toBeDefined()
  })
})
