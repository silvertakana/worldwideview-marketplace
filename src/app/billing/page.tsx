import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { UpgradeButton } from '@/components/BillingButtons'
import { PortalButton } from '@/components/BillingButtons'
import { cookies } from 'next/headers'
import styles from './billing.module.css'

export const metadata = { title: 'Billing' }

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Only three badge styles exist, so any paid tier other than Enterprise wears
// the Pro badge. Falling through to the Free badge would paint a paying
// customer's plan in the free colour.
function badgeClass(tier: string, paid: boolean): string {
  if (!paid) return styles.planBadgeFree
  return tier === 'enterprise' ? styles.planBadgeEnterprise : styles.planBadgePro
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
  const effectiveTier = sub?.effectiveTier ?? 'free'
  const hasSubscription = sub?.hasSubscription ?? false
  const trialDaysRemaining = sub?.trialDaysRemaining ?? null
  // "read-error" means the subscription could not be looked up at all. The tier
  // below is then a fail-safe rather than a fact, so the page must not tell a
  // paying customer they are on the Free plan and invite them to pay again.
  const unknown = sub?.source === 'read-error'
  const isPaid = !unknown && effectiveTier !== 'free'
  const tierLabel = capitalize(effectiveTier)

  return (
    <main className={styles.pageContainer}>
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Subscription Plan</h2>

        <div className={styles.planBody}>
          <div className={styles.planBadgeRow}>
            <span className={`${styles.planBadge} ${badgeClass(effectiveTier, isPaid)}`}>
              {unknown ? 'Unknown' : tierLabel}
            </span>
            {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
              <span className={styles.trialBadge}>
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining in trial
              </span>
            )}
          </div>

          <p className={styles.planName}>
            {unknown ? 'Subscription unavailable' : isPaid ? `${tierLabel} Plan` : 'Free Plan'}
          </p>

          <p className={styles.planDescription}>
            {unknown &&
              'We could not read your subscription just now, so this page cannot confirm your plan. Your subscription itself has not changed. Refresh in a moment, or use Manage Subscription to open your billing page in Stripe.'}
            {!unknown &&
              !isPaid &&
              'Upgrade to Pro for early access to new data layers, priority support, and advanced plugin capabilities.'}
            {effectiveTier === 'pro' &&
              'You are on the Pro plan. Enjoy priority support, advanced plugins, and early access to new features.'}
            {effectiveTier === 'enterprise' &&
              'You are on the Enterprise plan. Enjoy unlimited instances and dedicated support.'}
            {isPaid &&
              effectiveTier !== 'pro' &&
              effectiveTier !== 'enterprise' &&
              `You are on the ${tierLabel} plan.`}
          </p>
        </div>

        <hr className={styles.divider} />

        <div className={styles.actions}>
          {!unknown && !isPaid && <UpgradeButton />}
          {hasSubscription && <PortalButton />}
        </div>
      </section>
    </main>
  )
}
