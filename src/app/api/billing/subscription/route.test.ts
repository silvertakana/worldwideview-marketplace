import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { GET } from './route'
import { createClient } from '@/lib/supabase/server'
import { row, serve } from './test-support'

const mockCreateClient = vi.mocked(createClient)
const user = { id: 'supa-1', email: 'a@b.com' }

let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  fetchSpy = vi.fn()
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => vi.unstubAllGlobals())

describe('GET /api/billing/subscription', () => {
  it('returns 401 and reads nothing without a session', async () => {
    const { tables } = serve(mockCreateClient, { user: null })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(tables).toEqual([])
  })

  it('reads the durable record by owner id and reports the paid plan', async () => {
    const { tables, columns } = serve(mockCreateClient, {
      user,
      results: { user_id: { data: [row()], error: null } },
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      tier: 'pro',
      effectiveTier: 'pro',
      hasSubscription: true,
      stripeCustomerId: 'cus_1',
      stripeCurrentPeriodEnd: '2026-10-01T00:00:00.000Z',
      plan: 'pro',
      source: 'record',
    })
    expect(tables).toEqual(['billing_subscriptions'])
    expect(columns).toEqual(['user_id'])
    expect(fetchSpy).not.toHaveBeenCalled() // answered from the database, not a service call
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('reports the paid plan even with PROVISIONING_API_KEY and the auth host unset', async () => {
    // The regression: the route used to answer "free" whenever that key was
    // missing, and this app has never carried it.
    delete process.env.PROVISIONING_API_KEY
    delete process.env.NEXT_PUBLIC_AUTH_HOST_URL
    serve(mockCreateClient, { user, results: { user_id: { data: [row()], error: null } } })

    const body = await (await GET()).json()

    expect(body.effectiveTier).toBe('pro')
    expect(body.source).toBe('record')
  })

  it('reports free for a canceled subscription while still offering the Stripe portal', async () => {
    serve(mockCreateClient, {
      user,
      results: {
        user_id: { data: [row({ status: 'canceled', stripe_subscription_id: 'sub_9' })], error: null },
      },
    })

    const body = await (await GET()).json()

    expect(body).toMatchObject({ effectiveTier: 'free', hasSubscription: true, source: 'record' })
  })

  it('reports no-record when there is no row, trying the owner email as well', async () => {
    const { columns } = serve(mockCreateClient, { user })

    const body = await (await GET()).json()

    expect(body).toMatchObject({ effectiveTier: 'free', hasSubscription: false, source: 'no-record' })
    expect(columns).toEqual(['user_id', 'email'])
  })

  it('finds the row through the owner email when user_id is empty or another id space', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // A marketplace-originated checkout stores the marketplace's own user id
    // (a Prisma cuid), which is not the Supabase uid the session carries.
    const stored = [{ user_id: null }, { user_id: 'clxmarketplacecuid' }]

    for (const variant of stored) {
      serve(mockCreateClient, {
        user,
        results: { user_id: { data: [], error: null }, email: { data: [row(variant)], error: null } },
      })

      const body = await (await GET()).json()

      expect(body.effectiveTier).toBe('pro')
      expect(body.source).toBe('record')
    }
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})
