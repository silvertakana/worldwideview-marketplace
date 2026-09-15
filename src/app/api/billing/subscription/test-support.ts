import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubscriptionRow } from '@/lib/billing/subscription-row'

/**
 * Test doubles for the billing subscription route. Deliberately not named
 * `*.test.ts`: vitest would collect it as a test file with no tests in it.
 */

export type QueryResult = { data: unknown; error: unknown }

interface Builder {
  select: () => Builder
  eq: (name: string) => Builder
  order: () => Builder
  limit: () => Promise<QueryResult>
}

/** Stands in for the PostgREST chain the reader builds (select/eq/order/limit,
 *  awaited at limit). Which lookup answered is keyed by the eq column, so a
 *  test asserts both the query and the answer. */
function queryBuilder(results: Map<string, QueryResult>, columns: string[]): Builder {
  let column = ''
  const builder: Builder = {
    select: () => builder,
    eq: (name: string) => {
      column = name
      columns.push(name)
      return builder
    },
    order: () => builder,
    limit: () => Promise.resolve(results.get(column) ?? { data: [], error: null }),
  }
  return builder
}

export interface ServeOptions {
  user: { id: string; email?: string | null } | null
  /** Answers keyed by the eq column: "user_id" or "email". A missing key reads
   *  as an empty result. */
  results?: Record<string, QueryResult>
  /** Records every table `from()` was called with. */
  tables?: string[]
  /** Records every eq column, in call order. */
  columns?: string[]
}

export function sessionClient(options: ServeOptions): SupabaseClient {
  const results = new Map(Object.entries(options.results ?? {}))
  return {
    auth: { getUser: async () => ({ data: { user: options.user } }) },
    from: (table: string) => {
      options.tables?.push(table)
      return queryBuilder(results, options.columns ?? [])
    },
  } as unknown as SupabaseClient
}

/** The slice of `vi.fn()` this needs, so the helper stays free of vitest. */
export interface MockedFactory {
  mockResolvedValue: (value: never) => unknown
}

/**
 * Wires a fake session client into the mocked `createClient` factory for one
 * request, and hands back the recorders that show which lookups it made.
 */
export function serve(
  mockCreateClient: MockedFactory,
  options: Omit<ServeOptions, 'tables' | 'columns'>,
): { tables: string[]; columns: string[] } {
  const tables: string[] = []
  const columns: string[] = []
  mockCreateClient.mockResolvedValue(sessionClient({ ...options, tables, columns }) as never)
  return { tables, columns }
}

export function row(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
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
