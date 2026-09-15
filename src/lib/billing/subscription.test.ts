import { describe, it, expect } from 'vitest'
import { freeSubscription, toMarketplaceSubscription } from './subscription'
import type { SubscriptionRow } from './subscription-row'

function row(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    user_id: 'supa-1',
    email: 'a@b.com',
    stripe_customer_id: 'cus_1',
    stripe_subscription_id: 'sub_1',
    plan: 'pro',
    status: 'active',
    current_period_end: '2026-10-01T00:00:00.000Z',
    trial_ends_at: null,
    ...overrides,
  }
}

describe('freeSubscription', () => {
  it('claims no paid tier and carries the reason', () => {
    expect(freeSubscription('read-error')).toEqual({
      tier: 'free',
      effectiveTier: 'free',
      hasSubscription: false,
      stripeCustomerId: null,
      stripeCurrentPeriodEnd: null,
      trialDaysRemaining: null,
      plan: 'free',
      source: 'read-error',
    })
  })
})

describe('toMarketplaceSubscription', () => {
  it.each(['active', 'trialing', 'past_due'])('grants the plan while the status is %s', (status) => {
    const result = toMarketplaceSubscription(row({ status }))

    expect(result.effectiveTier).toBe('pro')
    expect(result.source).toBe('record')
  })

  it.each(['canceled', 'suspended', 'incomplete', ''])('grants nothing for status %s', (status) => {
    const result = toMarketplaceSubscription(row({ status }))

    expect(result.effectiveTier).toBe('free')
    expect(result.tier).toBe('free')
    expect(result.plan).toBe('free')
  })

  it('normalizes the case and padding of a stored status', () => {
    expect(toMarketplaceSubscription(row({ status: ' Active ' })).effectiveTier).toBe('pro')
  })

  it('never invents a plan for an entitled row that has none', () => {
    expect(toMarketplaceSubscription(row({ plan: null })).effectiveTier).toBe('free')
    expect(toMarketplaceSubscription(row({ plan: '  ' })).effectiveTier).toBe('free')
  })

  it('reports the carrier plan for a paid tier the marketplace has no copy for', () => {
    // The hub sells "team"; the marketplace must pass it through rather than
    // collapsing it to free.
    expect(toMarketplaceSubscription(row({ plan: 'team' })).effectiveTier).toBe('team')
  })

  it('keeps the portal available when the subscription is canceled', () => {
    const result = toMarketplaceSubscription(row({ status: 'canceled', stripe_subscription_id: 'sub_9' }))

    expect(result.hasSubscription).toBe(true)
  })

  it('offers the portal for a trial that has no subscription id yet', () => {
    expect(toMarketplaceSubscription(row({ status: 'trialing', stripe_subscription_id: null })).hasSubscription).toBe(
      true,
    )
  })

  it('offers no portal for a row with neither a subscription nor a trial', () => {
    const result = toMarketplaceSubscription(row({ status: 'canceled', stripe_subscription_id: null }))

    expect(result.hasSubscription).toBe(false)
  })

  describe('trialDaysRemaining', () => {
    const now = Date.parse('2026-09-01T00:00:00.000Z')

    it('counts the days left in a running trial', () => {
      const trialEnds = new Date(now + 5 * 86_400_000).toISOString()

      expect(toMarketplaceSubscription(row({ status: 'trialing', trial_ends_at: trialEnds }), now).trialDaysRemaining).toBe(5)
    })

    it('reports nothing once the trial has ended', () => {
      const trialEnds = new Date(now - 86_400_000).toISOString()

      expect(toMarketplaceSubscription(row({ trial_ends_at: trialEnds }), now).trialDaysRemaining).toBe(null)
    })

    it('reports nothing for a non-trialing status or an unparseable date', () => {
      expect(toMarketplaceSubscription(row({ status: 'active', trial_ends_at: '2026-09-05T00:00:00.000Z' }), now).trialDaysRemaining).toBe(null)
      expect(toMarketplaceSubscription(row({ status: 'trialing', trial_ends_at: 'not-a-date' }), now).trialDaysRemaining).toBe(null)
      expect(toMarketplaceSubscription(row({ status: 'trialing', trial_ends_at: null }), now).trialDaysRemaining).toBe(null)
    })
  })
})
