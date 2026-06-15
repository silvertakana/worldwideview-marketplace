import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { UpgradeButton } from '@/components/BillingButtons'
import { PortalButton } from '@/components/BillingButtons'
import { cookies } from 'next/headers'
import styles from './billing.module.css'

export const metadata = { title: 'Billing' }

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function getSubscription() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    // Forward auth cookies so the subscription route can validate the session
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ')
    const res = await fetch(`${baseUrl}/api/billing/subscription`, {
      headers: { Cookie: cookieHeader },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function BillingPage() {
  await requireSupabaseUser('/billing')
  const sub = await getSubscription()
  const plan = sub?.plan ?? 'free'
  const effectiveTier = sub?.effectiveTier ?? 'free'
  const hasSubscription = sub?.hasSubscription ?? false
  const trialDaysRemaining = sub?.trialDaysRemaining ?? null

  return (
    <main className={styles.pageContainer}>
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Subscription Plan</h2>

        <div className={styles.planBody}>
          <div className={styles.planBadgeRow}>
            <span
              className={`${styles.planBadge} ${styles[`planBadge${capitalize(plan)}`] ?? styles.planBadgeFree}`}
            >
              {capitalize(effectiveTier)}
            </span>
            {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
              <span className={styles.trialBadge}>
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining in trial
              </span>
            )}
          </div>

          <p className={styles.planName}>
            {effectiveTier === 'pro'
              ? 'Pro Plan'
              : effectiveTier === 'enterprise'
                ? 'Enterprise Plan'
                : 'Free Plan'}
          </p>

          <p className={styles.planDescription}>
            {effectiveTier === 'free' &&
              'Upgrade to Pro for early access to new data layers, priority support, and advanced plugin capabilities.'}
            {effectiveTier === 'pro' &&
              'You are on the Pro plan. Enjoy priority support, advanced plugins, and early access to new features.'}
            {effectiveTier === 'enterprise' &&
              'You are on the Enterprise plan. Enjoy unlimited instances and dedicated support.'}
          </p>
        </div>

        <hr className={styles.divider} />

        <div className={styles.actions}>
          {effectiveTier === 'free' && <UpgradeButton />}
          {hasSubscription && <PortalButton />}
        </div>
      </section>
    </main>
  )
}
