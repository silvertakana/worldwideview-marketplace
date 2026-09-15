import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubscriptionRow } from './subscription-row'
import { fetchSubscriptionRow } from './subscription-row'

/**
 * What the marketplace tells a user about their subscription.
 *
 * The answer comes from the hub's durable billing record, read directly out of
 * the shared Supabase project with the user's own session (subscription-row.ts
 * holds the query and the access rules). The marketplace never claims a paid
 * tier it has not read.
 *
 * WHY NOT THE HUB'S `/api/account`: that route authorizes by session cookie
 * only and ignores an `x-api-key` header, so it cannot serve a server-to-server
 * caller. The previous implementation called it with `PROVISIONING_API_KEY` --
 * a key the marketplace does not carry -- and returned the literal
 * `tier: "free"` fallback without reading anything, which showed paying
 * customers the Free plan and an "Upgrade to Pro" button.
 */

/**
 * Statuses that still grant the plan. The hub's webhook normalizes Stripe's
 * statuses before writing (unpaid and paused arrive as "suspended",
 * incomplete_expired as "canceled"), so a canceled or suspended row must never
 * resolve to a paid tier.
 */
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due'])

const MS_PER_DAY = 86_400_000

export interface MarketplaceSubscription {
  tier: string
  effectiveTier: string
  hasSubscription: boolean
  stripeCustomerId: string | null
  stripeCurrentPeriodEnd: string | null
  trialDaysRemaining: number | null
  plan: string
  /**
   * "record"    - answered from the durable record.
   * "no-record" - the user has no subscription on file.
   * "read-error"- the read failed, so the free tier below is a fail-safe and
   *               NOT a fact. Callers must not upsell on this answer.
   */
  source: 'record' | 'no-record' | 'read-error'
}

/** The fail-safe answer: no paid tier is claimed without a record. */
export function freeSubscription(source: 'no-record' | 'read-error'): MarketplaceSubscription {
  return {
    tier: 'free',
    effectiveTier: 'free',
    hasSubscription: false,
    stripeCustomerId: null,
    stripeCurrentPeriodEnd: null,
    trialDaysRemaining: null,
    plan: 'free',
    source,
  }
}

/** Entitlement for one durable row. */
export function toMarketplaceSubscription(
  row: SubscriptionRow,
  now: number = Date.now(),
): MarketplaceSubscription {
  const status = (row.status ?? '').trim().toLowerCase()
  const entitled = ENTITLED_STATUSES.has(status)
  const plan = entitled ? row.plan?.trim() || 'free' : 'free'
  return {
    tier: plan,
    effectiveTier: plan,
    // The management button follows the subscription id, not the entitlement:
    // a canceled customer still has a Stripe subscription to open.
    hasSubscription: Boolean(row.stripe_subscription_id) || status === 'trialing',
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeCurrentPeriodEnd: row.current_period_end ?? null,
    trialDaysRemaining: trialDaysRemaining(row, status, now),
    plan,
    source: 'record',
  }
}

function trialDaysRemaining(row: SubscriptionRow, status: string, now: number): number | null {
  if (status !== 'trialing' || !row.trial_ends_at) return null
  const endsAt = Date.parse(row.trial_ends_at)
  if (Number.isNaN(endsAt)) return null
  const days = Math.ceil((endsAt - now) / MS_PER_DAY)
  return days > 0 ? days : null
}

/**
 * The marketplace's answer for one user: read the durable record, then map it.
 *
 * A failed read reports `source: "read-error"` so the caller can tell "this
 * user pays for nothing" apart from "we could not find out" -- collapsing those
 * two into one silent "free" is the defect this module exists to remove.
 */
export async function readSubscription(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
): Promise<MarketplaceSubscription> {
  const { row, error } = await fetchSubscriptionRow(supabase, user)
  if (error) {
    console.error(`[billing] subscription read failed for user ${user.id}: ${error}`)
    return freeSubscription('read-error')
  }
  return row ? toMarketplaceSubscription(row) : freeSubscription('no-record')
}
