'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Header.module.css'

const NAV_LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/manage', label: 'My Plugins' },
  { href: '/submit', label: 'Submit Plugin' },
  { href: 'https://worldwideview.dev/docs', label: 'Docs' },
]

export default function NavLinks() {
  const pathname = usePathname()
  return (
    <>
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`${styles.navLink} ${pathname === href ? styles.navLinkActive : ''}`}
        >
          {label}
        </Link>
      ))}
    </>
  )
}
