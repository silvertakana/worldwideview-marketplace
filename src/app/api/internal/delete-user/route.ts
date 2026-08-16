import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteUserLimiter, getClientIp } from '@/lib/rateLimiters'

export async function POST(request: NextRequest) {
  // IP limiter runs BEFORE the secret check so failed bearer guesses also
  // consume budget — brute-force protection for MARKETPLACE_INTERNAL_SECRET.
  const limiter = deleteUserLimiter.check(getClientIp(request))
  if (limiter) return limiter

  const secret = process.env.MARKETPLACE_INTERNAL_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { supabaseUserId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { supabaseUserId } = body
  if (!supabaseUserId || typeof supabaseUserId !== 'string') {
    return NextResponse.json({ error: 'supabaseUserId is required' }, { status: 400 })
  }

  const marketplaceUser = await prisma.user.findUnique({
    where: { supabaseUserId },
  })

  if (!marketplaceUser) {
    // Idempotent: user never visited the marketplace, nothing to clean up.
    return NextResponse.json({ deleted: false, reason: 'user not found' })
  }

  await prisma.$transaction([
    prisma.marketplaceApiKey.deleteMany({ where: { userId: marketplaceUser.id } }),
    prisma.user.delete({ where: { supabaseUserId } }),
  ])

  return NextResponse.json({ deleted: true })
}
