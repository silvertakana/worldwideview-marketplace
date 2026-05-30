import { prisma } from '@/lib/prisma'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export async function getOrCreateMarketplaceUser(supabaseUser: SupabaseUser) {
  // Primary lookup: by Supabase user ID (fast path for returning users).
  const byId = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  })
  if (byId) return byId

  const email = supabaseUser.email ?? `${supabaseUser.id}@no-email`

  // Secondary lookup: by email. Handles the case where a row was created
  // without a supabaseUserId (e.g. pre-provisioned row, or a prior orphaned
  // sign-up), or after linkIdentity() merges a new OAuth identity into an
  // existing account and the row's supabaseUserId doesn't match yet.
  const byEmail = await prisma.user.findUnique({
    where: { email },
  })
  if (byEmail) {
    // Backfill the supabaseUserId so future lookups hit the fast path.
    if (byEmail.supabaseUserId !== supabaseUser.id) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: { supabaseUserId: supabaseUser.id },
      })
    }
    return byEmail
  }

  // No row exists yet — create one. If a concurrent request races here and
  // inserts first, catch the unique-constraint violation and re-fetch.
  try {
    return await prisma.user.create({
      data: {
        supabaseUserId: supabaseUser.id,
        email,
        tier: 'free',
      },
    })
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      // Unique constraint violation from a race — return whichever row won.
      const recovered = await prisma.user.findUnique({
        where: { supabaseUserId: supabaseUser.id },
      })
      if (recovered) return recovered
      return prisma.user.findUniqueOrThrow({ where: { email } })
    }
    throw err
  }
}
