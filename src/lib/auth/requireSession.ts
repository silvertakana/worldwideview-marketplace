import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

export async function getSupabaseUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireSupabaseUser(returnTo: string) {
  const user = await getSupabaseUser()
  if (!user) {
    // The auth host treats relative `next` values as relative to ITSELF, so
    // `next=/account` would land the user on the auth host's `/account` (which
    // does not exist) after login. Promote relative paths to absolute marketplace
    // URLs so the auth host's safeNext recognises the cookie-domain sibling and
    // redirects cross-origin back to the marketplace.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    let absoluteReturnTo = returnTo
    if (returnTo.startsWith('/') && siteUrl) {
      absoluteReturnTo = `${siteUrl.replace(/\/+$/, '')}${returnTo}`
    }
    redirect(`${authHost}/login?next=${encodeURIComponent(absoluteReturnTo)}`)
  }
  return user
}
