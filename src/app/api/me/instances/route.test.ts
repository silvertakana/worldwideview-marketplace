import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth and prisma before importing the route
vi.mock('@/lib/auth/requireSession', () => ({
  getSupabaseUser: vi.fn(),
}))

vi.mock('@/lib/auth/getOrCreateMarketplaceUser', () => ({
  getOrCreateMarketplaceUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    linkedInstance: {
      findMany: vi.fn(),
    },
  },
}))

import { GET } from './route'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'

const mockGetSupabaseUser = vi.mocked(getSupabaseUser)
const mockGetOrCreate = vi.mocked(getOrCreateMarketplaceUser)
const mockFindMany = vi.mocked(prisma.linkedInstance.findMany)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/me/instances', () => {
  it('returns 200 with empty instances array for unauthenticated request (NOT 401)', async () => {
    mockGetSupabaseUser.mockResolvedValue(null)

    const req = new Request('http://localhost/api/me/instances')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ instances: [] })
    expect(mockFindMany).not.toHaveBeenCalled()
    expect(mockGetOrCreate).not.toHaveBeenCalled()
  })

  it('returns 200 with instances array for an authenticated user with linked instances', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'supa-123' } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockGetOrCreate.mockResolvedValue({ id: 'mkt-456' } as never)
    mockFindMany.mockResolvedValue([
      { id: 'inst-1', url: 'http://localhost:3000', nickname: 'Local', lastUsedAt: new Date('2024-01-02') } as never,
      { id: 'inst-2', url: 'https://my.wwv.app', nickname: null, lastUsedAt: new Date('2024-01-01') } as never,
    ])

    const req = new Request('http://localhost/api/me/instances')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.instances).toHaveLength(2)
    expect(body.instances[0].id).toBe('inst-1')
    expect(mockGetOrCreate).toHaveBeenCalledWith({ id: 'supa-123' })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'mkt-456' },
        select: expect.objectContaining({ id: true, url: true, nickname: true, lastUsedAt: true }),
      }),
    )
  })

  it('returns 200 with empty instances array when authenticated user has no linked instances', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'supa-789' } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockGetOrCreate.mockResolvedValue({ id: 'mkt-999' } as never)
    mockFindMany.mockResolvedValue([])

    const req = new Request('http://localhost/api/me/instances')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ instances: [] })
  })
})
