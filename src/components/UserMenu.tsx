'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './Header.module.css'
import { diceBearUrl } from '@/lib/diceBear'

interface UserMenuProps {
  email: string | null
  displayName: string
  avatarUrl: string | null
  authHostUrl: string
  siteUrl: string
}

/**
 * Renders either a sign-in link or a compact circular avatar chip that opens a
 * dropdown menu for authenticated users.
 *
 * The chip shows only the avatar image (or initials when no image is available)
 * and relies on the `title` attribute for an accessible email tooltip.
 */
export default function UserMenu({ email, displayName, avatarUrl, authHostUrl, siteUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  // Hooks MUST be at top level (before any conditionals) — React rules of hooks
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!email) {
    // After login, return the user to the exact page they were on, including
    // query params (e.g. /browse?q=flight). Absolute URL so the auth host's
    // safeNext recognises it as a same-cookie-domain sibling and redirects
    // across origins rather than staying on the auth host root.
    const search = searchParams.toString()
    const returnTo = siteUrl
      ? `${siteUrl}${pathname}${search ? `?${search}` : ''}`
      : `${pathname}${search ? `?${search}` : ''}`
    return (
      <Link
        href={`${authHostUrl}/login?next=${encodeURIComponent(returnTo)}`}
        className={styles.signInLink}
      >
        Sign in
      </Link>
    )
  }

  async function handleSignOut() {
    setOpen(false)
    await fetch('/api/account/sign-out', { method: 'POST' })
    window.location.replace('/')
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        className={styles.avatarChip}
        onClick={() => setOpen((v) => !v)}
        title={email ?? ''}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <img src={avatarUrl ?? diceBearUrl(displayName || email || 'user')} alt="" className={styles.avatarImg} />
      </button>
      {open && (
        <div className={styles.dropdownMenu} role="menu">
          <Link
            href="/account"
            className={styles.dropdownItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            href="/manage"
            className={styles.dropdownItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            My Installs
          </Link>
          <hr className={styles.dropdownDivider} />
          <button className={styles.dropdownItem} role="menuitem" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
