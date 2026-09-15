import { describe, it, expect, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fetchSubscriptionRow } from './subscription-row'

/**
 * The chain in subscription-row.ts decides whether a paying customer sees a
 * paid tier or is invited to pay twice, and until now it was only ever asserted
 * against a hand-written fake -- which cannot show what the real PostgREST
 * client sends. These tests build a REAL client against an unreachable address
 * and capture the request the library generates, so the query string under test
 * is the library's, not our idea of it. Nothing here touches the network.
 */

const storedRow = {
  user_id: 'supa-1',
  email: 'a@b.com',
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: 'sub_1',
  plan: 'pro',
  status: 'active',
  current_period_end: '2026-10-01T00:00:00.000Z',
  trial_ends_at: null,
}

function clientReturning(
  respond: (url: string) => { body: unknown; status?: number },
): { client: SupabaseClient; requests: string[] } {
  const requests: string[] = []
  const fetchStub = (input: RequestInfo | URL): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input)
    requests.push(url)
    const { body, status } = respond(url)
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }
  return {
    client: createClient('http://127.0.0.1:9', 'dummy-anon-key', { global: { fetch: fetchStub } }),
    requests,
  }
}

describe('fetchSubscriptionRow over a real PostgREST client', () => {
  it('sends the owner-id, newest-first, single-row query the read depends on', async () => {
    const { client, requests } = clientReturning(() => ({ body: [storedRow] }))

    const result = await fetchSubscriptionRow(client, { id: 'supa-1', email: 'a@b.com' })

    expect(requests).toHaveLength(1) // the owner-id lookup answered; no email retry
    const url = new URL(requests[0])
    expect(url.pathname).toBe('/rest/v1/billing_subscriptions')
    expect(url.searchParams.get('user_id')).toBe('eq.supa-1')
    expect(url.searchParams.get('order')).toBe('updated_at.desc')
    expect(url.searchParams.get('limit')).toBe('1')
    expect(url.searchParams.get('select')).toContain('stripe_subscription_id')
    expect(url.searchParams.get('select')).not.toBe('*')
    expect(requests[0]).toContain('order=updated_at.desc')
    expect(requests[0]).toContain('limit=1')
    expect(result).toEqual({ row: storedRow, error: null })
  })

  it('falls back to the owner email with the same shape of query', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const orphan = { ...storedRow, user_id: null } // a marketplace-originated row
    const { client, requests } = clientReturning((url) =>
      url.includes('email=eq.') ? { body: [orphan] } : { body: [] },
    )

    const result = await fetchSubscriptionRow(client, { id: 'supa-1', email: 'a@b.com' })

    expect(requests).toHaveLength(2)
    expect(new URL(requests[0]).searchParams.get('user_id')).toBe('eq.supa-1')
    const second = new URL(requests[1])
    expect(second.searchParams.get('email')).toBe('eq.a@b.com')
    expect(second.searchParams.get('order')).toBe('updated_at.desc')
    expect(second.searchParams.get('limit')).toBe('1')
    expect(result.row?.stripe_customer_id).toBe('cus_1')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('surfaces the real library error shape when the table denies the read', async () => {
    const { client, requests } = clientReturning(() => ({
      body: { code: '42501', message: 'permission denied for table billing_subscriptions' },
      status: 403,
    }))

    const result = await fetchSubscriptionRow(client, { id: 'supa-1', email: 'a@b.com' })

    expect(requests).toHaveLength(1) // an error is not retried through the email lookup
    expect(result.row).toBeNull()
    expect(result.error).toContain('GRANT SELECT ON TABLE public.billing_subscriptions')
  })
})
