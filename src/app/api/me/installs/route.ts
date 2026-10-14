import { NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request): Promise<NextResponse> {
  const supabaseUser = await getSupabaseUser()

  if (!supabaseUser) {
    return NextResponse.json({ authed: false, pluginIds: [] })
  }

  // Installs are keyed by the marketplace User.id, which is what the install
  // writers (install/start, installs writer) persist — not the Supabase auth id.
  const user = await getOrCreateMarketplaceUser(supabaseUser)

  const records = await prisma.pluginInstall.findMany({
    where: { userId: user.id },
    select: { pluginId: true },
  })

  return NextResponse.json({ authed: true, pluginIds: records.map((r) => r.pluginId) })
}
