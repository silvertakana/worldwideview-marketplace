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
    pluginInstall: {
      upsert: vi.fn(),
    },
    plugin: {
      update: vi.fn(),
    },
  },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'

const mockGetSupabaseUser = vi.mocked(getSupabaseUser)
const mockGetOrCreate = vi.mocked(getOrCreateMarketplaceUser)
const mockUpsert = vi.mocked(prisma.pluginInstall.upsert)
const mockPluginUpdate = vi.mocked(prisma.plugin.update)

// Helper to construct a valid NextRequest with all required params
function makeValidRequest() {
  return new NextRequest(
    'http://marketplace.wwv.local:3002/api/install/start?' +
      new URLSearchParams({
        pluginId: 'test-plugin',
        version: '1.0.0',
        manifest: Buffer.from('{}').toString('base64'),
        instanceUrl: 'https://app.wwv.local:3000',
        redirectTo: '/plugins/test-plugin',
      }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/install/start', () => {
  it('returns 400 when instanceUrl is missing', async () => {
    const req = new NextRequest(
      'http://marketplace.wwv.local:3002/api/install/start?' +
        new URLSearchParams({
          pluginId: 'test-plugin',
          version: '1.0.0',
          manifest: Buffer.from('{}').toString('base64'),
        }),
    )
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('instanceUrl is required')
  })

  it('returns 400 when instanceUrl origin matches the marketplace origin', async () => {
    const req = new NextRequest(
      'http://marketplace.wwv.local:3002/api/install/start?' +
        new URLSearchParams({
          pluginId: 'test-plugin',
          version: '1.0.0',
          manifest: Buffer.from('{}').toString('base64'),
          instanceUrl: 'http://marketplace.wwv.local:3002',
        }),
    )
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('instanceUrl must not be the marketplace')
  })

  it('redirects to login when user is unauthenticated', async () => {
    process.env.NEXT_PUBLIC_AUTH_HOST_URL = 'https://wwv.local'
    mockGetSupabaseUser.mockResolvedValue(null as never)

    const req = makeValidRequest()
    const res = await GET(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/login?next=')
    expect(location).toContain('wwv.local')
  })

  it('fires upsert and redirects to instanceUrl install-redirect endpoint on happy path', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'user-abc' } as never)
    mockGetOrCreate.mockResolvedValue({ id: 'mkt-user-1' } as never)
    mockUpsert.mockResolvedValue({} as never)
    mockPluginUpdate.mockResolvedValue({} as never)

    const req = makeValidRequest()
    const res = await GET(req)

    // Flush both levels of the fire-and-forget .then() chain
    await Promise.resolve()
    await Promise.resolve()

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('app.wwv.local:3000/api/marketplace/install-redirect')
    expect(mockUpsert).toHaveBeenCalledOnce()
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_pluginId: { userId: 'mkt-user-1', pluginId: 'test-plugin' } },
      }),
    )
  })

  it('still redirects even when the DB write throws (TRACK-04)', async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: 'user-abc' } as never)
    mockGetOrCreate.mockResolvedValue({ id: 'mkt-user-1' } as never)
    mockUpsert.mockRejectedValue(new Error('DB exploded'))

    const req = makeValidRequest()
    const res = await GET(req)

    // Flush both levels of the fire-and-forget .then() chain so the rejection is caught
    await Promise.resolve()
    await Promise.resolve()

    // Error was swallowed by .catch() -- redirect still happens, no 500
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('install-redirect')
  })
})
