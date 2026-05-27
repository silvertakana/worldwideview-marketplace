import { Suspense } from 'react'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import NavLinks from './NavLinks'
import UserMenu from './UserMenu'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import styles from './Header.module.css'

export default async function Header() {
  const user = await getSupabaseUser()
  const email = user?.email ?? null
  const displayName: string =
    user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    ''
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null
  const authHostUrl = process.env.NEXT_PUBLIC_AUTH_HOST_URL ?? ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <img src="/logo/logo-icon.svg" alt="Logo" className={styles.logoImg} />
          WWV Marketplace
        </Link>

        <nav className={styles.nav}>
          <NavLinks />
          <ThemeToggle />
          <Suspense fallback={null}>
            <UserMenu email={email} displayName={displayName} avatarUrl={avatarUrl} authHostUrl={authHostUrl} siteUrl={siteUrl} />
          </Suspense>
        </nav>
      </div>
    </header>
  )
}
