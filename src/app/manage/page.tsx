"use client";

import { useState } from "react";
import Link from "next/link";
import { useInstalledPlugins } from "@/hooks/useInstalledPlugins";
import InstalledPluginCard from "@/components/InstalledPluginCard";
import InstanceConfig from "@/components/InstanceConfig";
import styles from "./page.module.css";

export default function ManagePage() {
  const { plugins, loading, error, configured, refetch } = useInstalledPlugins();
  const [showConfig, setShowConfig] = useState(false);

  function handleConfigured() {
    setShowConfig(false);
    refetch();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Plugins</h1>
        <p className={styles.subtitle}>
          Plugins installed on your WorldWideView instance.
        </p>
      </div>

      {/* Not configured — prompt to connect */}
      {!configured && !showConfig && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔗</span>
          <h2 className={styles.emptyTitle}>Connect Your Instance</h2>
          <p className={styles.emptyDesc}>
            Link your WorldWideView instance to manage installed plugins.
          </p>
          <button className={styles.connectBtn} onClick={() => setShowConfig(true)}>
            Configure Instance
          </button>
        </div>
      )}

      {showConfig && (
        <InstanceConfig
          onConfigured={handleConfigured}
          onCancel={() => setShowConfig(false)}
        />
      )}

      {/* Connection error */}
      {configured && error && (
        <div className={styles.errorState}>
          <p className={styles.errorMsg}>⚠️ {error}</p>
          <div className={styles.errorActions}>
            <button className={styles.retryBtn} onClick={refetch}>
              Retry
            </button>
            <button
              className={styles.reconfigBtn}
              onClick={() => setShowConfig(true)}
            >
              Reconfigure
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {configured && loading && (
        <div className={styles.loadingState}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      )}

      {/* Plugin list */}
      {configured && !loading && !error && plugins.length > 0 && (
        <div className={styles.list}>
          {plugins.map((p) => (
            <InstalledPluginCard
              key={p.id}
              pluginId={p.pluginId}
              version={p.version}
              installedAt={p.installedAt}
              onUninstalled={refetch}
            />
          ))}
        </div>
      )}

      {/* Empty — connected but nothing installed */}
      {configured && !loading && !error && plugins.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📭</span>
          <h2 className={styles.emptyTitle}>No Plugins Installed</h2>
          <p className={styles.emptyDesc}>
            Browse the catalog and install plugins to see them here.
          </p>
          <Link href="/browse" className={styles.browseLink}>
            Browse Plugins →
          </Link>
        </div>
      )}

      {/* Manage connection (bottom bar) */}
      {configured && !loading && (
        <div className={styles.footer}>
          <button
            className={styles.reconfigBtn}
            onClick={() => setShowConfig(true)}
          >
            ⚙ Change Instance
          </button>
        </div>
      )}
    </div>
  );
}
