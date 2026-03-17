"use client";

import { useState, type MouseEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { getInstanceUrl, getMarketplaceToken } from "@/lib/instanceStore";
import { KNOWN_PLUGINS } from "@/data/knownPlugins";
import { getInstallManifest } from "@/data/pluginManifests";
import { useInstalledIds } from "./InstalledPluginsProvider";
import InstanceConfig from "./InstanceConfig";
import styles from "./PluginCardActions.module.css";

interface Props {
  pluginId: string;
  version: string;
}

export default function PluginCardActions({ pluginId, version }: Props) {
  const { installedIds, refetch } = useInstalledIds();
  const isInstalled = installedIds.has(pluginId);
  const [uninstalling, setUninstalling] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  function buildRedirectUrl(instanceUrl: string): string {
    const known = KNOWN_PLUGINS.find((p) => p.id === pluginId);
    const detail = {
      id: pluginId,
      name: known?.npmPackage ?? pluginId,
      description: known?.longDescription ?? "",
      version,
      format: known?.format ?? "bundle",
      trust: known?.trust ?? "unverified",
      capabilities: known?.capabilities ?? ["data:own"],
      category: known?.category ?? "Custom",
      icon: known?.icon ?? "Package",
      installs: 0,
      author: "WorldWideView",
      tags: [],
      updatedAt: "",
      longDescription: known?.longDescription ?? "",
      compatibility: ">=0.1.0",
      changelog: known?.changelog ?? "",
    };
    const manifest = getInstallManifest(detail);
    const manifestB64 = btoa(
      unescape(encodeURIComponent(JSON.stringify(manifest)))
    );
    const redirectTo = window.location.href.split("?")[0];

    const url = new URL(`${instanceUrl}/api/marketplace/install-redirect`);
    url.searchParams.set("pluginId", pluginId);
    url.searchParams.set("version", version);
    url.searchParams.set("manifest", manifestB64);
    url.searchParams.set("redirectTo", redirectTo);
    return url.toString();
  }

  function handleInstall(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trackEvent("plugin_install_click", { pluginId });
    const instanceUrl = getInstanceUrl();
    if (!instanceUrl) {
      setShowConfig(true);
      return;
    }
    window.location.href = buildRedirectUrl(instanceUrl);
  }

  function handleConfigured() {
    setShowConfig(false);
    const instanceUrl = getInstanceUrl();
    if (instanceUrl) {
      window.location.href = buildRedirectUrl(instanceUrl);
    }
  }

  async function handleUninstall(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const instanceUrl = getInstanceUrl();
    if (!instanceUrl) return;

    setUninstalling(true);
    try {
      const res = await fetch(`${instanceUrl}/api/marketplace/uninstall`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getMarketplaceToken()
            ? { Authorization: `Bearer ${getMarketplaceToken()}` }
            : {}),
        },
        body: JSON.stringify({ pluginId }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        trackEvent("plugin_uninstall_success", { pluginId });
        refetch();
      }
    } catch {
      /* silently fail on card — user can retry from detail page */
    } finally {
      setUninstalling(false);
    }
  }

  return (
    <>
      {showConfig && (
        <InstanceConfig
          onConfigured={handleConfigured}
          onCancel={() => setShowConfig(false)}
        />
      )}

      <div className={styles.actions}>
        {isInstalled ? (
          <button
            className={`${styles.btn} ${styles.uninstall} ${uninstalling ? styles.loading : ""}`}
            onClick={handleUninstall}
            disabled={uninstalling}
          >
            {uninstalling ? "Removing…" : "Uninstall"}
          </button>
        ) : (
          <button
            className={`${styles.btn} ${styles.install}`}
            onClick={handleInstall}
          >
            Install
          </button>
        )}
      </div>
    </>
  );
}
