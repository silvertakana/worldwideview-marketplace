import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { getEffectiveTier } from '@/lib/auth/tierGating'
import { PortalButton, UpgradeButton } from '@/components/BillingButtons'
import styles from './billing.module.css'

export const metadata = { title: 'Billing' }

export default async function BillingPage() {
  const supabaseUser = await requireSupabaseUser('/billing')
  const marketplaceUser = await getOrCreateMarketplaceUser(supabaseUser)

  const tier = marketplaceUser.tier
  const effectiveTier = getEffectiveTier(marketplaceUser)
  const hasSubscription = !!marketplaceUser.stripeCustomerId
  const periodEnd = marketplaceUser.stripeCurrentPeriodEnd

  const isPro = effectiveTier === 'pro'

  return (
    <main className={styles.pageContainer}>
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Subscription Plan</h2>

        <div className={styles.planBody}>
          <div className={styles.planBadgeRow}>
            <span
              className={`${styles.planBadge}${isPro ? ` ${styles.planBadgePro}` : ` ${styles.planBadgeFree}`}`}
            >
              {isPro ? 'Pro' : 'Free'}
            </span>
          </div>

          <p className={styles.planName}>
            {isPro ? 'Pro Plan' : 'Free Plan'}
          </p>

          {periodEnd && (
            <p className={styles.planPeriod}>
              Current period ends{' '}
              {new Date(periodEnd).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}

          {!hasSubscription && (
            <p className={styles.planDescription}>
              Upgrade to Pro for early access to new data layers, priority support,
              and advanced plugin capabilities.
            </p>
          )}
        </div>

        <hr className={styles.divider} />

        <div className={styles.actions}>
          {hasSubscription ? (
            <PortalButton />
          ) : (
            <UpgradeButton />
          )}
        </div>
      </section>
    </main>
  )
}
