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
    pluginInstall: {
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
const mockFindMany = vi.mocked(prisma.pluginInstall.findMany)

// Identity fixtures: the Supabase auth id and the marketplace User.id are
// deliberately different so an implementation that conflates them fails loudly.
const SUPABASE_ID = 'supa-auth-user-a'
const MARKETPLACE_ID = 'mkt-user-a'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/me/installs', () => {
  it('queries installs by the marketplace User.id, not the Supabase auth id', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: SUPABASE_ID } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockGetOrCreate.mockResolvedValue({ id: MARKETPLACE_ID } as never)
    mockFindMany.mockResolvedValue([{ pluginId: 'plugin-a' } as never])

    const req = new Request('http://localhost/api/me/installs')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetOrCreate).toHaveBeenCalledWith({ id: SUPABASE_ID })
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: MARKETPLACE_ID },
      select: { pluginId: true },
    })
    expect(body).toEqual({ authed: true, pluginIds: ['plugin-a'] })
  })

  it('returns 200 with pluginIds for an authenticated user', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: SUPABASE_ID } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockGetOrCreate.mockResolvedValue({ id: MARKETPLACE_ID } as never)
    mockFindMany.mockResolvedValue([
      { pluginId: 'plugin-a' } as never,
      { pluginId: 'plugin-b' } as never,
    ])

    const req = new Request('http://localhost/api/me/installs')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ authed: true, pluginIds: ['plugin-a', 'plugin-b'] })
  })

  it('returns 200 with empty array for an unauthenticated request (NOT 401) with no helper or DB call', async () => {
    mockGetSupabaseUser.mockResolvedValue(null)

    const req = new Request('http://localhost/api/me/installs')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ authed: false, pluginIds: [] })
    expect(mockGetOrCreate).not.toHaveBeenCalled()
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('returns 200 with empty array when user has no installs', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: SUPABASE_ID } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockGetOrCreate.mockResolvedValue({ id: MARKETPLACE_ID } as never)
    mockFindMany.mockResolvedValue([])

    const req = new Request('http://localhost/api/me/installs')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ authed: true, pluginIds: [] })
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: MARKETPLACE_ID },
      select: { pluginId: true },
    })
  })

  it('returns only the resolved marketplace user installs for a second distinct identity', async () => {
    // Second distinct identity pair: a route that hardcodes the Supabase id
    // would query the wrong owner's rows.
    mockGetSupabaseUser.mockResolvedValue({ id: 'supa-auth-user-b' } as Awaited<ReturnType<typeof getSupabaseUser>>)
    mockGetOrCreate.mockResolvedValue({ id: 'mkt-user-b' } as never)
    mockFindMany.mockResolvedValue([{ pluginId: 'plugin-c' } as never])

    const req = new Request('http://localhost/api/me/installs')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ authed: true, pluginIds: ['plugin-c'] })
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: 'mkt-user-b' },
      select: { pluginId: true },
    })
  })
})
