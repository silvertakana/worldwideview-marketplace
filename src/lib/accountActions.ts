'use server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'

export async function disconnectInstance(instanceId: string) {
  const supabaseUser = await requireSupabaseUser('/account')
  const marketplaceUser = await getOrCreateMarketplaceUser(supabaseUser)
  const instance = await prisma.linkedInstance.findFirst({ where: { id: instanceId, userId: marketplaceUser.id } })
  if (!instance) return { ok: false }
  // Revoke all API keys issued for this instance's origin
  await prisma.marketplaceApiKey.updateMany({ where: { userId: marketplaceUser.id, origin: instance.url }, data: { revokedAt: new Date() } })
  await prisma.linkedInstance.delete({ where: { id: instance.id } })
  revalidatePath('/account')
  return { ok: true }
}
