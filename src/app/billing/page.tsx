import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { UpgradeButton } from '@/components/BillingButtons'
import styles from './billing.module.css'

export const metadata = { title: 'Billing' }

export default async function BillingPage() {
  await requireSupabaseUser('/billing')

  // Marketplace no longer stores tier/stripe info locally.
  // The canonical source is worldwideview Account API via the Phase 58 proxy.
  // Phase 60 will add the proxy read. For now, default to "free" tier.

  return (
    <main className={styles.pageContainer}>
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Subscription Plan</h2>

        <div className={styles.planBody}>
          <div className={styles.planBadgeRow}>
            <span className={`${styles.planBadge} ${styles.planBadgeFree}`}>
              Free
            </span>
          </div>

          <p className={styles.planName}>
            Free Plan
          </p>

          <p className={styles.planDescription}>
            Upgrade to Pro for early access to new data layers, priority support,
            and advanced plugin capabilities.
          </p>
        </div>

        <hr className={styles.divider} />

        <div className={styles.actions}>
          <UpgradeButton />
        </div>
      </section>
    </main>
  )
}
