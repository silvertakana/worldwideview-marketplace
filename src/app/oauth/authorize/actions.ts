'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'

const CODE_TTL_SECONDS = 60

/**
 * Returns true when redirectUri is an allowed target for the given clientId.
 *
 * For clientId='local-app':
 *  - Any http://localhost:<port>/... URL (RFC 8252 native-app loopback)
 *  - Exact custom scheme: wwv://oauth/callback
 */
function isAllowedRedirectUri(redirectUri: string, clientId: string): boolean {
  if (clientId !== 'local-app') return false

  // Custom scheme shortcut (URL constructor rejects non-http(s) schemes in many runtimes)
  if (redirectUri === 'wwv://oauth/callback') return true

  try {
    const parsed = new URL(redirectUri)
    // Allow any localhost port over plain HTTP (loopback, RFC 8252 S7.3)
    if (parsed.origin.startsWith('http://localhost:')) return true
  } catch {
    // Malformed URI
  }

  return false
}

export async function approveAuthorization(form: FormData) {
  const clientId      = String(form.get('client_id') ?? '')
  const redirectUri   = String(form.get('redirect_uri') ?? '')
  const state         = String(form.get('state') ?? '')
  const codeChallenge = String(form.get('code_challenge') ?? '')
  const ccMethod      = String(form.get('code_challenge_method') ?? '')
  const scope         = String(form.get('scope') ?? '')

  if (clientId !== 'local-app') throw new Error('unsupported client')
  if (ccMethod !== 'S256') throw new Error('S256 required')
  if (!isAllowedRedirectUri(redirectUri, clientId)) throw new Error('access_denied')

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

  if (!isAllowedRedirectUri(redirectUri, clientId)) throw new Error('access_denied')

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
