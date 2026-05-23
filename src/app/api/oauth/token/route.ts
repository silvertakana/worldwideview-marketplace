import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { issueApiKey } from '@/lib/auth/apiKeyIssuance'

function err(error: string, description?: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status })
}

function verifyChallenge(verifier: string, challenge: string) {
  const hash = createHash('sha256').update(verifier).digest('base64url')
  return hash === challenge
}

export async function POST(request: Request) {
  const form = await request.formData()
  const grantType    = String(form.get('grant_type') ?? '')
  const clientId     = String(form.get('client_id') ?? '')
  const code         = String(form.get('code') ?? '')
  const codeVerifier = String(form.get('code_verifier') ?? '')
  const redirectUri  = String(form.get('redirect_uri') ?? '')

  if (grantType !== 'authorization_code') return err('unsupported_grant_type')
  if (!clientId || !code || !codeVerifier || !redirectUri) return err('invalid_request')

  const stored = await prisma.oAuthAuthorizationCode.findUnique({ where: { code } })
  if (!stored) return err('invalid_grant', 'unknown code')

  // ALWAYS delete first — single-use, prevents replay even if validation fails
  await prisma.oAuthAuthorizationCode.delete({ where: { code } })

  if (stored.expiresAt < new Date()) return err('invalid_grant', 'code expired')
  if (stored.clientId !== clientId)  return err('invalid_grant', 'client mismatch')
  if (stored.redirectUri !== redirectUri) return err('invalid_grant', 'redirect_uri mismatch')
  if (!verifyChallenge(codeVerifier, stored.codeChallenge)) return err('invalid_grant', 'code_verifier mismatch')

  const { apiKey } = await issueApiKey({
    userId: stored.userId,
    name: 'Local App (PKCE)',
  })

  return NextResponse.json({
    access_token: apiKey,
    token_type: 'Bearer',
  })
}
