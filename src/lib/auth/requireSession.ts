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
    const authHost = process.env.NEXT_PUBLIC_AUTH_HOST_URL!
    redirect(`${authHost}/login?next=${encodeURIComponent(returnTo)}`)
  }
  return user
}
