import Link from 'next/link'
import { Package, History } from 'lucide-react'
import type { User } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import styles from './InstallHistory.module.css'

interface Props {
  marketplaceUser: User
}

export default async function InstallHistory({ marketplaceUser }: Props) {
  const installs = await prisma.pluginInstall.findMany({
    where: { userId: marketplaceUser.id },
    orderBy: { installedAt: 'desc' },
  })

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <History size={18} className={styles.sectionIcon} />
        <h2 className={styles.sectionTitle}>Installed Plugins</h2>
      </div>

      {installs.length === 0 ? (
        <div className={styles.emptyState}>
          <Package size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No plugins installed yet</p>
          <p className={styles.emptyDesc}>
            <Link href="/browse" className={styles.browseLink}>Browse the marketplace</Link>{' '}
            to find and install plugins.
          </p>
        </div>
      ) : (
        <ul className={styles.historyList}>
          {installs.map((install) => {
            const displayName = install.pluginSlug
              .replace(/-/g, ' ')
              .replace(/^\w/, (c) => c.toUpperCase())

            const formattedDate = install.installedAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })

            let hostname = install.instanceUrl
            try {
              hostname = new URL(install.instanceUrl).hostname
            } catch {
              // fall back to raw string if URL is malformed
            }

            return (
              <li key={install.id} className={styles.historyRow}>
                <div className={styles.rowMain}>
                  <p className={styles.pluginName}>{displayName}</p>
                  <p className={styles.pluginMeta}>v{install.pluginVersion} &middot; {formattedDate}</p>
                  <p className={styles.instanceHostname}>{hostname}</p>
                </div>
                <Link href={`/browse/${install.pluginId}`} className={styles.reinstallLink}>
                  Re-install -&gt;
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
