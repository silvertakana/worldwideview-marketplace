'use client'

import { useEffect, useState } from 'react'
import { Github, Mail, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserIdentity } from '@supabase/supabase-js'
import styles from './account.module.css'

function titleCase(str: string): string {
  if (str === 'github') return 'GitHub'
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getDisplayValue(identity: UserIdentity): string {
  if (identity.provider === 'email') {
    return (identity.identity_data?.email as string | undefined) ?? identity.provider
  }
  if (identity.provider === 'github') {
    return (
      (identity.identity_data?.user_name as string | undefined) ??
      (identity.identity_data?.preferred_username as string | undefined) ??
      identity.provider
    )
  }
  return identity.provider
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'github') return <Github size={18} className={styles.linkedAccountIcon} />
  if (provider === 'email') return <Mail size={18} className={styles.linkedAccountIcon} />
  return <Link2 size={18} className={styles.linkedAccountIcon} />
}

export default function LinkedAccounts() {
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUserIdentities().then(({ data, error: fetchError }) => {
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setIdentities(data?.identities ?? [])
      }
      setLoading(false)
    })
  }, [])

  async function handleLinkGithub() {
    setLinking(true)
    setError(null)
    const supabase = createClient()
    try {
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider: 'github',
        options: { redirectTo: window.location.origin + '/account?linked=1' },
      })
      if (linkError) {
        setError(linkError.message)
        setLinking(false)
      }
      // On success the browser navigates away; no state update needed.
    } finally {
      // Defensively reset linking if the redirect did not happen (e.g., error path).
      // Note: setLinking(false) above already handles the error case; this is a safety net.
      // We only reach here after the try body completes without a redirect.
    }
  }

  if (loading) {
    return <p className={styles.sectionHint}>Loading linked accounts...</p>
  }

  const hasGithub = identities?.some((id) => id.provider === 'github') ?? false

  return (
    <>
      {error && <p className={styles.error}>{error}</p>}

      {identities && identities.length > 0 && (
        <ul className={styles.linkedAccountsList}>
          {identities.map((identity) => (
            <li key={identity.id} className={styles.linkedAccountItem}>
              <ProviderIcon provider={identity.provider} />
              <span className={styles.linkedAccountLabel}>
                {titleCase(identity.provider)}
              </span>
              <span className={styles.linkedAccountMeta}>
                {getDisplayValue(identity)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!hasGithub && (
        <button
          type="button"
          className={styles.linkGithubButton}
          disabled={linking}
          onClick={handleLinkGithub}
        >
          <Github size={16} />
          {linking ? 'Redirecting to GitHub...' : 'Link GitHub account'}
        </button>
      )}
    </>
  )
}
