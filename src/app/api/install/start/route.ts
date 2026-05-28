import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/install/start
 *
 * Server-side auth gate for the plugin install flow (ADR-003 Phase 2C).
 * Validates the request, enforces authentication, ensures a MarketplaceUser row
 * exists, then bounces the browser to the WWV install-redirect endpoint.
 *
 * Query params:
 *   pluginId    — plugin identifier
 *   version     — semver version string
 *   manifest    — base64-encoded PluginManifest JSON (assembled by InstallButton)
 *   instanceUrl — the user's WWV instance base URL
 *   redirectTo  — the marketplace page to return to after install
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const pluginId = searchParams.get('pluginId')
  const version = searchParams.get('version')
  const manifest = searchParams.get('manifest')
  const instanceUrl = searchParams.get('instanceUrl')
  const redirectTo = searchParams.get('redirectTo') ?? ''

  // Validate instanceUrl: required, must be http/https, must not be the marketplace itself
  if (!instanceUrl) {
    return NextResponse.json({ error: 'instanceUrl is required' }, { status: 400 })
  }
  let parsedInstance: URL
  try {
    parsedInstance = new URL(instanceUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid instanceUrl' }, { status: 400 })
  }
  if (parsedInstance.protocol !== 'http:' && parsedInstance.protocol !== 'https:') {
    return NextResponse.json({ error: 'instanceUrl must use http or https' }, { status: 400 })
  }
  if (parsedInstance.origin === request.nextUrl.origin) {
    return NextResponse.json({ error: 'instanceUrl must not be the marketplace' }, { status: 400 })
  }

  if (!pluginId || !version || !manifest) {
    return NextResponse.json(
      { error: 'Missing required params: pluginId, version, manifest' },
      { status: 400 },
    )
  }

  // Auth gate — redirect to login if not signed in
  const user = await getSupabaseUser()
  if (!user) {
    const authHost = process.env.NEXT_PUBLIC_AUTH_HOST_URL!
    const next = encodeURIComponent(request.nextUrl.toString())
    return NextResponse.redirect(`${authHost}/login?next=${next}`)
  }

  // Ensure a MarketplaceUser row exists (idempotent, tier defaults to 'free')
  const marketplaceUser = await getOrCreateMarketplaceUser(user)

  // Fire-and-forget install tracking: upsert PluginInstall row + increment Plugin.installs counter.
  // DB failures are swallowed so they never block the install redirect (TRACK-04).
  void Promise.resolve()
    .then(() =>
      prisma.pluginInstall.upsert({
        where: { userId_pluginId: { userId: marketplaceUser.id, pluginId } },
        update: { pluginVersion: version, instanceUrl },
        create: {
          userId: marketplaceUser.id,
          pluginId,
          pluginSlug: pluginId,
          pluginVersion: version,
          instanceUrl,
        },
      })
    )
    .then(() =>
      prisma.plugin.update({
        where: { id: pluginId },
        data: { installs: { increment: 1 } },
      })
    )
    .catch((err: unknown) => {
      console.error('[install/start] tracking write failed:', err)
    })

  // Build the WWV install-redirect URL and bounce the browser there
  const installRedirectUrl = new URL(`${instanceUrl}/api/marketplace/install-redirect`)
  installRedirectUrl.searchParams.set('pluginId', pluginId)
  installRedirectUrl.searchParams.set('version', version)
  installRedirectUrl.searchParams.set('manifest', manifest)
  installRedirectUrl.searchParams.set('redirectTo', redirectTo)

  return NextResponse.redirect(installRedirectUrl.toString())
}
