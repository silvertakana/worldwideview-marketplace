import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'
import { validateInstanceUrl } from '@/lib/instanceValidation'
import { instancesLinkLimiter, getClientIp } from '@/lib/rateLimiters'

/**
 * POST /api/instances/link
 * Body: { url: string }
 *
 * Idempotently upserts a LinkedInstance row for the authenticated user and
 * bumps `lastUsedAt`. Called fire-and-forget from InstanceCapture (after the
 * ?from_instance= URL param is captured) and from InstanceConfig (after the
 * user manually saves a URL in the fallback modal).
 *
 * Anonymous calls silently 401 so the client doesn't have to pre-check the
 * session - both call sites just fire the request and ignore the response.
 */
export async function POST(request: NextRequest) {
  const limiter = instancesLinkLimiter.check(getClientIp(request))
  if (limiter) return limiter

  const supabaseUser = await getSupabaseUser()
  if (!supabaseUser) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 })
  }

  const validated = validateInstanceUrl(
    typeof body.url === 'string' ? body.url : null,
    request.nextUrl.origin,
  )
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 400 })
  }

  const user = await getOrCreateMarketplaceUser(supabaseUser)

  const instance = await prisma.linkedInstance.upsert({
    where: { userId_url: { userId: user.id, url: validated.url } },
    create: { userId: user.id, url: validated.url },
    update: { lastUsedAt: new Date() },
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
