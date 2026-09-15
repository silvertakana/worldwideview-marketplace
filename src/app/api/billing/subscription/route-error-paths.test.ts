import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { GET } from './route'
import { createClient } from '@/lib/supabase/server'
import { serve } from './test-support'

const mockCreateClient = vi.mocked(createClient)

/**
 * The route's fail-safe path. A failed read must not look like "this user pays
 * for nothing": the answer stays free (the only safe tier to assume) but is
 * marked `read-error` so the billing page can refuse to upsell on it.
 */
describe('GET /api/billing/subscription failure handling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports a read error, not a silent free tier, when the table is not readable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { columns } = serve(mockCreateClient, {
      user: { id: 'supa-1', email: 'a@b.com' },
      results: {
        user_id: {
          data: null,
          error: { code: '42501', message: 'permission denied for table billing_subscriptions' },
        },
      },
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.effectiveTier).toBe('free')
    expect(body.source).toBe('read-error')
    expect(columns).toEqual(['user_id']) // no point trying the email lookup too
    expect(String(error.mock.calls[0]?.[0])).toContain('GRANT SELECT ON TABLE public.billing_subscriptions')
    error.mockRestore()
  })

  it('reports a read error when the session client itself throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreateClient.mockRejectedValue(new Error('cookies() outside a request scope') as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.effectiveTier).toBe('free')
    expect(body.source).toBe('read-error')
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
