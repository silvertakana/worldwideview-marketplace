"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Link2, Inbox, AlertTriangle, RefreshCw, Settings } from "lucide-react";
import { useInstalledPlugins } from "@/hooks/useInstalledPlugins";
import InstalledPluginCard from "@/components/InstalledPluginCard";
import InstanceConfig from "@/components/InstanceConfig";
import LinkedInstancesPanel from "@/components/LinkedInstancesPanel";
import { setMarketplaceToken } from "@/lib/instanceStore";
import styles from "./page.module.css";

export default function ManagePage() {
  const { plugins, loading, error, configured, refetch } = useInstalledPlugins();
  const [showConfig, setShowConfig] = useState(false);

  // Detect #token= returned from WWV grant-token redirect
  useEffect(() => {
    const hash = window.location.hash;
    const tokenMatch = hash.match(/[#&]token=([^&]*)/);
    if (tokenMatch?.[1]) {
      setMarketplaceToken(tokenMatch[1]);
      // Clean the fragment from URL without triggering a navigation
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Link2 size={40} className={styles.emptyIcon} strokeWidth={1.5} />
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
          returnPath={typeof window !== "undefined" ? window.location.origin + "/manage" : "/manage"}
        />
      )}

      {/* Connection error */}
      {configured && error && (
        <div className={styles.errorState}>
          <AlertTriangle size={20} className={styles.errorIcon} />
          <p className={styles.errorMsg}>{error}</p>
          <div className={styles.errorActions}>
            <button className={styles.retryBtn} onClick={refetch}>
              <RefreshCw size={14} />
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
              key={p.pluginId}
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
          <Inbox size={40} className={styles.emptyIcon} strokeWidth={1.5} />
          <h2 className={styles.emptyTitle}>No Plugins Installed</h2>
          <p className={styles.emptyDesc}>
            Browse the catalog and install plugins to see them here.
          </p>
          <Link href="/browse" className={styles.browseLink}>
            Browse Plugins
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
            <Settings size={14} />
            Change Instance
          </button>
        </div>
      )}

      <LinkedInstancesPanel onAddInstance={() => setShowConfig(true)} />
    </div>
  );
}
