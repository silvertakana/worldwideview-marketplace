import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth and prisma before importing the route
vi.mock('@/lib/auth/requireSession', () => ({
  getSupabaseUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pluginInstall: {
      findMany: vi.fn(),
    },
  },
}))

import { GET } from './route'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { prisma } from '@/lib/prisma'

const mockGetSupabaseUser = vi.mocked(getSupabaseUser)
const mockFindMany = vi.mocked(prisma.pluginInstall.findMany)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/me/installs', () => {
  it('returns 200 with pluginIds for an authenticated user', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'user-123' } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockFindMany.mockResolvedValue([
      { pluginId: 'plugin-a' } as never,
      { pluginId: 'plugin-b' } as never,
    ])

    const req = new Request('http://localhost/api/me/installs')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ authed: true, pluginIds: ['plugin-a', 'plugin-b'] })
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      select: { pluginId: true },
    })
  })

  it('returns 200 with empty array for an unauthenticated request (NOT 401)', async () => {
    mockGetSupabaseUser.mockResolvedValue(null)

    const req = new Request('http://localhost/api/me/installs')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ authed: false, pluginIds: [] })
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('returns 200 with empty array when user has no installs', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'user-456' } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockFindMany.mockResolvedValue([])

    const req = new Request('http://localhost/api/me/installs')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ authed: true, pluginIds: [] })
  })
})
