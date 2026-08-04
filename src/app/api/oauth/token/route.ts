import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { issueApiKey } from '@/lib/auth/apiKeyIssuance'
import { tokenLimiter, tokenFailureLimiter, getClientIp } from '@/lib/rateLimiters'

function err(error: string, description?: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status })
}

/**
 * Failure response guarded by the per-IP brute-force limiter
 * (tokenFailureLimiter: 5/min). Checks the limiter before returning the error.
 */
function fail(request: Request, error: string, description?: string, status = 400) {
  const rateLimited = tokenFailureLimiter.check(getClientIp(request))
  if (rateLimited) return rateLimited
  return err(error, description, status)
}

function verifyChallenge(verifier: string, challenge: string) {
  const hash = createHash('sha256').update(verifier).digest('base64url')
  return hash === challenge
}

/**
 * Normalised origin for a redeemed redirect URI. Custom schemes (wwv://) have
 * no web origin → null; http(s) URIs reduce to scheme + host + port.
 */
function deriveOrigin(redirectUri: string): string | null {
  if (redirectUri.startsWith('wwv://')) return null
  try {
    return new URL(redirectUri).origin
  } catch {
    return null
  }
}

/**
 * Human-readable key name derived from the origin: drops the scheme and any
 * default port, keeps non-default ports (e.g. localhost:3000 → "localhost:3000").
 */
function deriveKeyName(origin: string | null): string {
  if (!origin) return 'Local App (PKCE)'
  try {
    const url = new URL(origin)
    const port = url.port && url.port !== '443' && url.port !== '80' ? `:${url.port}` : ''
    return `${url.hostname}${port}`
  } catch {
    return origin
  }
}

export async function POST(request: Request) {
  const limiter = tokenLimiter.check(getClientIp(request))
  if (limiter) return limiter

  const form = await request.formData()
  const grantType    = String(form.get('grant_type') ?? '')
  const clientId     = String(form.get('client_id') ?? '')
  const code         = String(form.get('code') ?? '')
  const codeVerifier = String(form.get('code_verifier') ?? '')
  const redirectUri  = String(form.get('redirect_uri') ?? '')

  if (grantType !== 'authorization_code') return fail(request, 'unsupported_grant_type')
  if (!clientId || !code || !codeVerifier || !redirectUri) return fail(request, 'invalid_request')

  const stored = await prisma.oAuthAuthorizationCode.findUnique({ where: { code } })
  if (!stored) return fail(request, 'invalid_grant', 'unknown code')

  // ALWAYS delete first — single-use, prevents replay even if validation fails
  await prisma.oAuthAuthorizationCode.delete({ where: { code } })

  if (stored.expiresAt < new Date()) return fail(request, 'invalid_grant', 'code expired')
  if (stored.clientId !== clientId)  return fail(request, 'invalid_grant', 'client mismatch')
  if (stored.redirectUri !== redirectUri) return fail(request, 'invalid_grant', 'redirect_uri mismatch')
  if (!verifyChallenge(codeVerifier, stored.codeChallenge)) return fail(request, 'invalid_grant', 'code_verifier mismatch')

  const origin = deriveOrigin(redirectUri)
  const { apiKey } = await issueApiKey({
    userId: stored.userId,
    name: deriveKeyName(origin),
    origin: origin ?? undefined,
  })

  // Fire-and-forget: link the redeemed origin so the account page can offer a
  // Disconnect button. Never blocks the token response; failures are logged.
  if (origin) {
    void prisma.linkedInstance.upsert({
      where: { userId_url: { userId: stored.userId, url: origin } },
      update: { lastUsedAt: new Date() },
      create: { userId: stored.userId, url: origin },
    }).catch((e) => console.warn('LinkedInstance upsert failed:', e.message))
  }

  return NextResponse.json({
    access_token: apiKey,
    token_type: 'Bearer',
  })
}
