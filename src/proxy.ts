import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildCookieOptions } from '@/lib/supabase/cookieOptions'
import { authorizeLimiter, getClientIp } from '@/lib/rateLimiters'

export async function proxy(request: NextRequest) {
  // Primary rate-limiting source for the OAuth authorize page: return a real
  // HTTP 429 (with Retry-After) before the page renders. Runs before session
  // refresh so an authorize flood does not trigger Supabase work. The page
  // itself keeps its own check as defense in depth.
  if (request.nextUrl.pathname === '/oauth/authorize') {
    const limited = authorizeLimiter.check(getClientIp(request))
    if (limited) return limited
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: buildCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refreshes an expired session and writes the rotated cookie onto `response`.
  // Do not insert any logic between createServerClient and getClaims().
  await supabase.auth.getClaims()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
