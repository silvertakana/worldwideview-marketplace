import { NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request): Promise<NextResponse> {
  const user = await getSupabaseUser()

  if (!user) {
    return NextResponse.json({ authed: false, pluginIds: [] })
  }

  const records = await prisma.pluginInstall.findMany({
    where: { userId: user.id },
    select: { pluginId: true },
  })

  return NextResponse.json({ authed: true, pluginIds: records.map((r) => r.pluginId) })
}
