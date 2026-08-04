'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { classifyRedirectTier } from '@/lib/redirectTier'

const CODE_TTL_SECONDS = 60

export { classifyRedirectTier }
export type { RedirectTier, RedirectClassification } from '@/lib/redirectTier'

export async function approveAuthorization(form: FormData) {
  const clientId      = String(form.get('client_id') ?? '')
  const redirectUri   = String(form.get('redirect_uri') ?? '')
  const state         = String(form.get('state') ?? '')
  const codeChallenge = String(form.get('code_challenge') ?? '')
  const ccMethod      = String(form.get('code_challenge_method') ?? '')
  const scope         = String(form.get('scope') ?? '')

  if (clientId !== 'local-app') throw new Error('unsupported client')
  if (ccMethod !== 'S256') throw new Error('S256 required')
  if (!classifyRedirectTier(redirectUri).allowed) throw new Error('access_denied')

  const here = `/oauth/authorize?${new URLSearchParams({
    client_id: clientId, response_type: 'code', code_challenge: codeChallenge,
    code_challenge_method: ccMethod, state, redirect_uri: redirectUri, scope,
  }).toString()}`

  const supabaseUser = await requireSupabaseUser(here)
  const marketplaceUser = await getOrCreateMarketplaceUser(supabaseUser)

  const code = randomBytes(32).toString('base64url')
  await prisma.oAuthAuthorizationCode.create({
    data: {
      code,
      codeChallenge,
      codeChallengeMethod: ccMethod,
      clientId,
      redirectUri,
      scope,
      userId: marketplaceUser.id,
      expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000),
    },
  })

  let finalUrl: string
  if (redirectUri.startsWith('wwv://')) {
    const sep = redirectUri.includes('?') ? '&' : '?'
    finalUrl = `${redirectUri}${sep}code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`
  } else {
    const url = new URL(redirectUri)
    url.searchParams.set('code', code)
    if (state) url.searchParams.set('state', state)
    finalUrl = url.toString()
  }
  redirect(finalUrl)
}

export async function denyAuthorization(form: FormData) {
  const clientId    = String(form.get('client_id') ?? '')
  const redirectUri = String(form.get('redirect_uri') ?? '')
  const state       = String(form.get('state') ?? '')

  if (clientId !== 'local-app') throw new Error('access_denied')
  if (!classifyRedirectTier(redirectUri).allowed) throw new Error('access_denied')

  let finalUrl: string
  if (redirectUri.startsWith('wwv://')) {
    const sep = redirectUri.includes('?') ? '&' : '?'
    finalUrl = `${redirectUri}${sep}error=access_denied${state ? `&state=${encodeURIComponent(state)}` : ''}`
  } else {
    const url = new URL(redirectUri)
    url.searchParams.set('error', 'access_denied')
    if (state) url.searchParams.set('state', state)
    finalUrl = url.toString()
  }
  redirect(finalUrl)
}
