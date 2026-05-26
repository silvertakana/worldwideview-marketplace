import { NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabaseUser = await getSupabaseUser()
  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const marketplaceUser = await getOrCreateMarketplaceUser(supabaseUser)

  const [linkedInstances, apiKeys] = await Promise.all([
    prisma.linkedInstance.findMany({
      where: { userId: marketplaceUser.id },
      orderBy: { lastUsedAt: 'desc' },
      select: { url: true, createdAt: true, lastUsedAt: true },
    }),
    prisma.marketplaceApiKey.findMany({
      where: { userId: marketplaceUser.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { name: true, createdAt: true, lastUsedAt: true },
    }),
  ])

  return NextResponse.json({
    linked_instances: linkedInstances.map((i) => ({
      instanceUrl: i.url,
      createdAt: i.createdAt.toISOString(),
      lastUsedAt: i.lastUsedAt?.toISOString() ?? null,
    })),
    api_keys: apiKeys.map((k) => ({
      name: k.name,
      createdAt: k.createdAt.toISOString(),
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    })),
  })
}
