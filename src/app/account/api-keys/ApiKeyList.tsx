"use client";

import { useState } from "react";
import styles from "./page.module.css";

interface ApiKeyItem {
  id: string;
  keyPrefix: string | null;
  name: string | null;
  createdAt: Date;
}

interface Props {
  keys: ApiKeyItem[];
}

export function ApiKeyList({ keys: initialKeys }: Props) {
  const [keys, setKeys] = useState(initialKeys);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this API key? This action cannot be undone.")) {
      return;
    }

    setRevokingId(id);

    try {
      const res = await fetch(`/api/account/api-keys/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Optimistic removal from list
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        const body = await res.json();
        alert(body.error || "Failed to revoke API key");
      }
    } catch {
      alert("Network error while revoking API key");
    } finally {
      setRevokingId(null);
    }
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  }

  function displayKey(key: ApiKeyItem): string {
    if (key.name) return key.name;
    if (key.keyPrefix) return key.keyPrefix + "...";
    return "Unnamed key";
  }

  return (
    <div className={styles.list}>
      {keys.map((key) => (
        <div key={key.id} className={styles.keyCard}>
          <div className={styles.keyInfo}>
            <span className={styles.keyName}>{displayKey(key)}</span>
            <span className={styles.keyMeta}>
              Created {formatDate(key.createdAt)}
            </span>
          </div>
          <button
            className={styles.revokeBtn}
            onClick={() => handleRevoke(key.id)}
            disabled={revokingId === key.id}
            aria-label={`Revoke ${displayKey(key)}`}
          >
            {revokingId === key.id ? "Revoking..." : "Revoke"}
          </button>
        </div>
      ))}
    </div>
  );
}
