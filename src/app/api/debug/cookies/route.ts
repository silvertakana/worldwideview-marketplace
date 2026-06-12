import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const sbCookies = allCookies.filter(c => c.name.includes('sb-'))

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getSession()

  const user = await getSupabaseUser()

  return NextResponse.json({
    totalCookies: allCookies.length,
    sbCookieCount: sbCookies.length,
    sbCookies: sbCookies.map(c => ({ name: c.name, valueLen: c.value.length })),
    getSession: data ? { hasSession: !!data.session, error: error?.message ?? null } : { hasSession: false, error: error?.message ?? null },
    getUserResult: user ? { email: user.email } : null,
    envVars: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) ?? 'missing',
      cookieDomain: process.env.NEXT_PUBLIC_WWV_COOKIE_DOMAIN ?? 'missing',
    },
  })
}
