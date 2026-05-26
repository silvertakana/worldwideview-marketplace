import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import NavLinks from './NavLinks'
import UserMenu from './UserMenu'
import { getSupabaseUser } from '@/lib/auth/requireSession'
import styles from './Header.module.css'

export default async function Header() {
  const user = await getSupabaseUser()
  const email = user?.email ?? null
  const authHostUrl = process.env.NEXT_PUBLIC_AUTH_HOST_URL ?? ''

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
          <UserMenu email={email} authHostUrl={authHostUrl} />
        </nav>
      </div>
    </header>
  )
}
