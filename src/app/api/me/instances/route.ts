import { NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request): Promise<NextResponse> {
  const supabaseUser = await getSupabaseUser()

  if (!supabaseUser) {
    return NextResponse.json({ instances: [] })
  }

  const user = await getOrCreateMarketplaceUser(supabaseUser)

  const rows = await prisma.linkedInstance.findMany({
    where: { userId: user.id },
    orderBy: { lastUsedAt: 'desc' },
    select: { id: true, url: true, nickname: true, lastUsedAt: true },
  })

  return NextResponse.json({ instances: rows })
}
