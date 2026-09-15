import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reads the hub's durable billing record for one user.
 *
 * The hub is the billing authority: its Stripe webhook writes one row per
 * customer into the shared Supabase project's `billing_subscriptions` table
 * (worldwideview-web: supabase/migrations/20260915120001_*.sql, written by
 * src/lib/billing/records.ts). The marketplace is only a reader of it. See
 * subscription.ts for why the marketplace does not ask the hub over HTTP.
 *
 * Authorization is the database's job: the read goes out on the signed-in
 * user's own session client, so the policy `users_read_own_subscriptions`
 * (`user_id = auth.uid()`) scopes every row returned here to that user.
 */

/** The columns entitlement is decided from. Deliberately not `*`: the row also
 *  carries Stripe ids the marketplace never uses. */
const COLUMNS =
  'user_id, email, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, trial_ends_at'

/** A row of `billing_subscriptions` as the hub writes it (worldwideview-web:
 *  src/lib/billing/billing-tables.ts). `user_id` is nullable by design there. */
export interface SubscriptionRow {
  user_id: string | null
  email: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: string | null
  status: string | null
  current_period_end: string | null
  trial_ends_at: string | null
}

export interface RowLookup {
  /** The newest row for the user, or null when the durable record has none. */
  row: SubscriptionRow | null
  /** Set when the read itself failed. Null does NOT mean "no subscription":
   *  RLS filters rows it denies without raising, so "no row" can also mean
   *  "a row exists that this user is not allowed to see". */
  error: string | null
}

type QueryError = { code?: string; message?: string } | null

/** Postgres SQLSTATE for "permission denied for table". */
const PERMISSION_DENIED = '42501'

/**
 * The durable record for one user, newest first.
 *
 * TWO LOOKUPS, because one Stripe account is written by two apps that disagree
 * about what a user id is: the hub stores its Supabase auth uid, while the
 * marketplace's own checkout stores the marketplace's local Prisma user id (a
 * cuid). A row from a marketplace upgrade therefore carries a `user_id` that is
 * not the uid this session holds. Both writers are right about their own id
 * space, so the owner is resolved by the two things they agree on -- the
 * session uid and the account email. The email lookup needs the table's SELECT
 * policy to admit an owner's own email (see the handoff note); until it does it
 * returns nothing and costs one extra query on the "no row" path, and the
 * warning below is the evidence that the gap is real.
 */
export async function fetchSubscriptionRow(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
): Promise<RowLookup> {
  const byUser = await lookup(supabase, 'user_id', user.id)
  if (byUser.error) return { row: null, error: describeReadError(byUser.error) }
  if (byUser.rows.length > 0) return { row: byUser.rows[0], error: null }

  if (!user.email) return { row: null, error: null }

  const byEmail = await lookup(supabase, 'email', user.email)
  if (byEmail.error) return { row: null, error: describeReadError(byEmail.error) }
  if (byEmail.rows.length > 0) {
    console.warn(
      `[billing] subscription for user ${user.id} is stored without user_id (matched by email); ` +
        'an owner-id read alone cannot see it.',
    )
    return { row: byEmail.rows[0], error: null }
  }

  return { row: null, error: null }
}

async function lookup(
  supabase: SupabaseClient,
  column: 'user_id' | 'email',
  value: string,
): Promise<{ rows: SubscriptionRow[]; error: QueryError }> {
  const { data, error } = await supabase
    .from('billing_subscriptions')
    .select(COLUMNS)
    .eq(column, value)
    .order('updated_at', { ascending: false })
    .limit(1)
  return {
    rows: (data ?? []) as unknown as SubscriptionRow[],
    error: (error ?? null) as QueryError,
  }
}

/**
 * Names the likely fix instead of forwarding a bare PostgREST message. This
 * project's other tables had to be granted explicitly after RLS was enabled
 * (worldwideview-web: 20260814000001_grant_user_entitlements_access.sql), so a
 * 42501 here means the shared table is still granted to service_role only.
 */
function describeReadError(error: NonNullable<QueryError>): string {
  if (error.code === PERMISSION_DENIED) {
    return (
      `permission denied for table billing_subscriptions (${error.message ?? 'no message'}) - ` +
      'the table is granted to service_role only; the shared project needs ' +
      'GRANT SELECT ON TABLE public.billing_subscriptions TO authenticated'
    )
  }
  return error.message ?? 'unknown read error'
}
