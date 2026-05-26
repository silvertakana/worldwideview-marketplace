'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import styles from './Header.module.css'

interface UserMenuProps {
  email: string | null
  authHostUrl: string
}

export default function UserMenu({ email, authHostUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    return (
      <Link
        href={`${authHostUrl}/login?next=${encodeURIComponent('/')}`}
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
        className={styles.userChip}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {email}
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
