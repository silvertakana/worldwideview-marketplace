import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth and prisma before importing the route
vi.mock('@/lib/auth/requireSession', () => ({
  getSupabaseUser: vi.fn(),
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
import { prisma } from '@/lib/prisma'

const mockGetSupabaseUser = vi.mocked(getSupabaseUser)
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
  })

  it('returns 200 with instances array for an authenticated user with linked instances', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'user-123' } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockFindMany.mockResolvedValue([
      { id: 'inst-1', url: 'http://localhost:3000', nickname: 'Local' } as never,
      { id: 'inst-2', url: 'https://my.wwv.app', nickname: null } as never,
    ])

    const req = new Request('http://localhost/api/me/instances')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      instances: [
        { id: 'inst-1', url: 'http://localhost:3000', nickname: 'Local' },
        { id: 'inst-2', url: 'https://my.wwv.app', nickname: null },
      ],
    })
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, url: true, nickname: true },
    })
  })

  it('returns 200 with empty instances array when authenticated user has no linked instances', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'user-456' } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockFindMany.mockResolvedValue([])

    const req = new Request('http://localhost/api/me/instances')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ instances: [] })
  })
})
