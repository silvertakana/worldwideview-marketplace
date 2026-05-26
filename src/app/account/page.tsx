import Link from 'next/link'
import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'
import styles from './account.module.css'

export const metadata = { title: 'Your Account' }

export default async function AccountPage() {
  const supabaseUser = await requireSupabaseUser('/account')
  const marketplaceUser = await getOrCreateMarketplaceUser(supabaseUser)

  const [linkedInstances, apiKeys] = await Promise.all([
    prisma.linkedInstance.findMany({
      where: { userId: marketplaceUser.id },
      orderBy: { lastUsedAt: 'desc' },
    }),
    prisma.marketplaceApiKey.findMany({
      where: { userId: marketplaceUser.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <main className={styles.pageContainer}>
      <div className={styles.card}>
        <h1 className={styles.title}>Your Account</h1>

        {/* Identity section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <p className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Email</span>
            <span className={styles.fieldValue}>{supabaseUser.email}</span>
          </p>
          <p className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Display name</span>
            <span className={styles.fieldValue}>
              {supabaseUser.user_metadata?.display_name ?? (
                <span className={styles.muted}>Not set</span>
              )}
            </span>
          </p>
          <p className={styles.editHint}>
            <a
              href={`${process.env.NEXT_PUBLIC_AUTH_HOST_URL}/accounts`}
              className={styles.externalLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Edit your profile on WorldWideView Hub
            </a>
          </p>
        </section>

        <hr className={styles.divider} />

        {/* Linked instances section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Linked Instances</h2>
          {linkedInstances.length === 0 ? (
            <p className={styles.emptyState}>
              No instances linked yet. Install a plugin from the{' '}
              <Link href="/browse" className={styles.inlineLink}>Browse</Link> page to link your first instance.
            </p>
          ) : (
            <ul className={styles.instanceList}>
              {linkedInstances.map((inst) => (
                <li key={inst.id} className={styles.instanceItem}>
                  <span className={styles.instanceUrl}>{inst.url}</span>
                  {inst.nickname && (
                    <span className={styles.instanceNickname}>{inst.nickname}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className={styles.divider} />

        {/* API keys section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>API Keys</h2>
          <p className={styles.sectionHint}>
            Full install history and key management are available in{' '}
            <Link href="/manage" className={styles.inlineLink}>My Plugins</Link>.
          </p>
          {apiKeys.length === 0 ? (
            <p className={styles.emptyState}>No active API keys.</p>
          ) : (
            <ul className={styles.keyList}>
              {apiKeys.map((key) => (
                <li key={key.id} className={styles.keyItem}>
                  <span className={styles.keyName}>{key.name ?? 'Unnamed key'}</span>
                  <code className={styles.keyMask}>...{key.keyHash.slice(-4)}</code>
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className={styles.divider} />

        {/* Sign out -- POST form so it works without JS */}
        <section className={styles.section}>
          <form action="/api/account/sign-out" method="POST">
            <button type="submit" className={styles.signOutButton}>
              Sign Out
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
