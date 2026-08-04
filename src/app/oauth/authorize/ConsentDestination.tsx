import { isLookalikeHostname } from '@/lib/lookalikeDomain'
import type { RedirectClassification } from './actions'
import styles from './page.module.css'

/**
 * Tier-aware destination block for the OAuth consent screen. The destination
 * origin is the single most important piece of information on this page —
 * for self-hosted instances it IS the security proposition.
 */
export default function ConsentDestination({ cls }: { cls: RedirectClassification }) {
  if (cls.tier === 'loopback') {
    return (
      <div className={styles.destination}>
        <div className={styles.destinationLabel}>Destination</div>
        <p className={styles.destinationText}>This will connect to your local computer.</p>
      </div>
    )
  }

  if (cls.tier === 'operator') {
    return (
      <div className={styles.destination}>
        <div className={styles.destinationLabel}>Destination</div>
        <p className={styles.destinationText}>Verified WorldWideView instance</p>
        <code className={styles.destinationOrigin}>{cls.origin}</code>
      </div>
    )
  }

  if (cls.tier === 'self-hosted') {
    let lookalike = false
    try {
      lookalike = isLookalikeHostname(new URL(cls.origin).hostname)
    } catch {
      lookalike = false
    }
    return (
      <div className={styles.destination}>
        <div className={styles.destinationLabel}>Destination</div>
        <p className={styles.destinationText}>Send your marketplace access to:</p>
        <code className={styles.destinationOrigin}>{cls.origin}</code>
        <p className={styles.destinationText}>Confirm this is your own globe instance.</p>
        {lookalike && (
          <div className={styles.lookalikeWarning} role="alert">
            This domain looks unusual. Check it carefully before approving.
          </div>
        )}
      </div>
    )
  }

  return null
}
