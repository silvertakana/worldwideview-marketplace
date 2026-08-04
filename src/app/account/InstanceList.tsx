import Link from 'next/link'
import { Link2, Server } from 'lucide-react'
import type { LinkedInstance } from '@prisma/client'
import { disconnectInstance } from '@/lib/accountActions'
import styles from './account.module.css'

export default function InstanceList({ instances }: { instances: LinkedInstance[] }) {
  if (instances.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Link2 size={32} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No instances linked yet</p>
        <p className={styles.emptyDesc}>
          Install a plugin from the{' '}
          <Link href="/browse" className={styles.inlineLink}>Browse</Link>{' '}
          page to link your first instance.
        </p>
      </div>
    )
  }

  return (
    <ul className={styles.instanceList}>
      {instances.map((inst) => (
        <li key={inst.id} className={styles.instanceItem}>
          <Server size={14} className={styles.instanceIcon} />
          <span className={styles.instanceUrl}>{inst.url}</span>
          {inst.nickname && (
            <span className={styles.instanceNickname}>{inst.nickname}</span>
          )}
          <form
            action={disconnectInstance.bind(null, inst.id) as unknown as (
              formData: FormData,
            ) => Promise<void>}
          >
            <button type="submit" className={styles.disconnectButton}>
              Disconnect
            </button>
          </form>
        </li>
      ))}
    </ul>
  )
}
