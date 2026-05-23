import { prisma } from '@/lib/prisma'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export async function getOrCreateMarketplaceUser(supabaseUser: SupabaseUser) {
  const existing = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  })
  if (existing) return existing

  return prisma.user.create({
    data: {
      supabaseUserId: supabaseUser.id,
      email: supabaseUser.email ?? `${supabaseUser.id}@no-email`,
      tier: 'free',
    },
  })
}
