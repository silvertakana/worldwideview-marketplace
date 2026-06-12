import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/instances/[id]
 * Removes a linked instance. 404 if the row isn't owned by the caller -
 * never expose existence of rows belonging to other users.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabaseUser = await getSupabaseUser()
  if (!supabaseUser) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { id } = await params
  const user = await getOrCreateMarketplaceUser(supabaseUser)

  const owned = await prisma.linkedInstance.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!owned) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  await prisma.linkedInstance.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

/**
 * PATCH /api/instances/[id]
 * Body: { nickname: string | null }
 * Renames a linked instance. Same ownership rules as DELETE.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const supabaseUser = await getSupabaseUser()
  if (!supabaseUser) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: { nickname?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 })
  }

  const nickname =
    body.nickname === null
      ? null
      : typeof body.nickname === 'string' && body.nickname.trim().length > 0
        ? body.nickname.trim().slice(0, 80)
        : undefined

  if (nickname === undefined) {
    return NextResponse.json(
      { error: 'nickname must be a string or null' },
      { status: 400 },
    )
  }

  const { id } = await params
  const user = await getOrCreateMarketplaceUser(supabaseUser)

  const owned = await prisma.linkedInstance.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!owned) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const instance = await prisma.linkedInstance.update({
    where: { id },
    data: { nickname },
    select: {
      id: true,
      url: true,
      nickname: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return NextResponse.json({ instance })
}
