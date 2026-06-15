'use client'

import { useState } from 'react'
import styles from '@/app/billing/billing.module.css'

export function PortalButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Portal error:', data.error)
        setLoading(false)
      }
    } catch (err) {
      console.error('Failed to open portal:', err)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${styles.portalButton}${loading ? ` ${styles.portalButtonDisabled}` : ''}`}
    >
      {loading ? 'Opening portal...' : 'Manage Subscription'}
    </button>
  )
}

export function UpgradeButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', data.error)
        setLoading(false)
      }
    } catch (err) {
      console.error('Failed to start checkout:', err)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${styles.portalButton}${loading ? ` ${styles.portalButtonDisabled}` : ''}`}
    >
      {loading ? 'Redirecting...' : 'Upgrade to Pro'}
    </button>
  )
}
