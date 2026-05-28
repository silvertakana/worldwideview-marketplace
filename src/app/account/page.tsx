import Link from 'next/link'
import { ExternalLink, Link2, KeyRound, LogOut, Server, Package } from 'lucide-react'
import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { getOrCreateMarketplaceUser } from '@/lib/auth/getOrCreateMarketplaceUser'
import { prisma } from '@/lib/prisma'
import { diceBearUrl } from '@/lib/diceBear'
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

  const displayName: string =
    supabaseUser.user_metadata?.display_name ??
    supabaseUser.user_metadata?.full_name ??
    supabaseUser.user_metadata?.name ??
    ''
  const oauthAvatarUrl: string | null =
    supabaseUser.user_metadata?.avatar_url ??
    supabaseUser.user_metadata?.picture ??
    null
  const avatarSeed = displayName || supabaseUser.email || 'user'

  return (
    <main className={styles.pageContainer}>
      {/* Profile section */}
      <section className={styles.card}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarBlock}>
            <img
              src={oauthAvatarUrl ?? diceBearUrl(avatarSeed)}
              alt=""
              className={styles.profileAvatar}
            />
            <a
              href={`${process.env.NEXT_PUBLIC_AUTH_HOST_URL}/accounts`}
              className={styles.inlineLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Change photo
            </a>
          </div>
          <div className={styles.profileMeta}>
            <h1 className={styles.title}>
              {displayName || supabaseUser.email}
            </h1>
            {displayName && (
              <p className={styles.profileEmail}>{supabaseUser.email}</p>
            )}
          </div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionTitle}>Profile</h2>
        <p className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Email</span>
          <span className={styles.fieldValue}>{supabaseUser.email}</span>
        </p>
        <p className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Display name</span>
          <span className={styles.fieldValue}>
            {displayName || <span className={styles.muted}>Not set</span>}
          </span>
        </p>

        <div className={styles.editHint}>
          <a
            href={`${process.env.NEXT_PUBLIC_AUTH_HOST_URL}/accounts`}
            className={styles.secondaryButton}
            target="_blank"
            rel="noopener noreferrer"
          >
            Edit on WorldWideView Hub
            <ExternalLink size={14} className={styles.btnIcon} />
          </a>
        </div>
      </section>

      {/* Linked instances section */}
      <section className={styles.card}>
        <div className={styles.sectionHeading}>
          <Server size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Linked Instances</h2>
        </div>

        {linkedInstances.length === 0 ? (
          <div className={styles.emptyState}>
            <Link2 size={32} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No instances linked yet</p>
            <p className={styles.emptyDesc}>
              Install a plugin from the{' '}
              <Link href="/browse" className={styles.inlineLink}>Browse</Link>{' '}
              page to link your first instance.
            </p>
          </div>
        ) : (
          <ul className={styles.instanceList}>
            {linkedInstances.map((inst) => (
              <li key={inst.id} className={styles.instanceItem}>
                <Server size={14} className={styles.instanceIcon} />
                <span className={styles.instanceUrl}>{inst.url}</span>
                {inst.nickname && (
                  <span className={styles.instanceNickname}>{inst.nickname}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* API keys section */}
      <section className={styles.card}>
        <div className={styles.sectionHeading}>
          <KeyRound size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>API Keys</h2>
        </div>

        <p className={styles.sectionHint}>
          Full install history and key management are available in{' '}
          <Link href="/manage" className={styles.inlineLink}>My Plugins</Link>.
        </p>

        {apiKeys.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={32} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No active API keys</p>
            <p className={styles.emptyDesc}>
              API keys are created automatically when you install plugins.
            </p>
          </div>
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

      {/* Sign out */}
      <section className={styles.card}>
        <form action="/api/account/sign-out" method="POST">
          <button type="submit" className={styles.signOutButton}>
            <LogOut size={16} className={styles.btnIcon} />
            Sign Out
          </button>
        </form>
      </section>
    </main>
  )
}
