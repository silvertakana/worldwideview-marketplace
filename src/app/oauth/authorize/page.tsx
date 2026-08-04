import { Globe } from 'lucide-react'
import { headers } from 'next/headers'
import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { approveAuthorization, denyAuthorization } from './actions'
import { classifyRedirectTier } from '@/lib/redirectTier'
import ConsentDestination from './ConsentDestination'
import { authorizeLimiter, getClientIp } from '@/lib/rateLimiters'
import styles from './page.module.css'

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const h = await headers()
  const ip = getClientIp({ headers: h } as unknown as Request)
  const ipLimit = authorizeLimiter.check(ip)
  if (ipLimit) return <p>Too many attempts. Please wait a minute and try again.</p>
  const required = ['client_id', 'response_type', 'code_challenge', 'code_challenge_method', 'state', 'redirect_uri', 'scope'] as const
  for (const k of required) {
    if (!sp[k]) return <p>Missing required parameter: {k}</p>
  }
  if (sp.response_type !== 'code') return <p>response_type must be &quot;code&quot;</p>
  if (sp.code_challenge_method !== 'S256') return <p>code_challenge_method must be S256</p>

  const cls = classifyRedirectTier(sp.redirect_uri!)
  if (!cls.allowed) return <p>redirect_uri is not permitted</p>

  const here = `/oauth/authorize?${new URLSearchParams(sp as Record<string, string>).toString()}`
  const user = await requireSupabaseUser(here)

  const userLimit = authorizeLimiter.check(`user:${user.id}`)
  if (userLimit) return <p>Too many attempts. Please wait a minute and try again.</p>

  const hidden = Object.fromEntries(required.map(k => [k, sp[k]!]))

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <Globe />
          </div>
          <h1 className={styles.title}>Connect your globe to the Marketplace</h1>
          <p className={styles.userEmail}>Signed in as <strong>{user.email}</strong></p>
        </header>

        <section className={styles.body}>
          <ConsentDestination cls={cls} />

          <div className={styles.scopeCard}>
            <div className={styles.scopeLabel}>Permission requested</div>
            <p className={styles.scopeText}>Read your plugin library and install plugins to this instance.</p>
          </div>
        </section>

        <footer className={styles.footer}>
          <form action={approveAuthorization}>
            {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <button type="submit" className={`${styles.btn} ${styles.btnApprove}`}>Approve</button>
          </form>
          <form action={denyAuthorization}>
            <input type="hidden" name="redirect_uri" value={sp.redirect_uri!} />
            <input type="hidden" name="state" value={sp.state!} />
            <button type="submit" className={`${styles.btn} ${styles.btnDeny}`}>Deny</button>
          </form>
        </footer>
      </div>
    </main>
  )
}
