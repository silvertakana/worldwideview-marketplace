import { NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request): Promise<NextResponse> {
  const user = await getSupabaseUser()

  if (!user) {
    return NextResponse.json({ instances: [] })
  }

  const rows = await prisma.linkedInstance.findMany({
    where: { userId: user.id },
    orderBy: { lastUsedAt: 'desc' },
    select: { id: true, url: true, nickname: true },
  })

  return NextResponse.json({ instances: rows })
}
