"use client";

import { useState, type MouseEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { getInstanceUrl } from "@/lib/instanceStore";
import { KNOWN_PLUGINS } from "@/data/knownPlugins";
import { getInstallManifest } from "@/data/pluginManifests";
import { useInstalledIds } from "./InstalledPluginsProvider";
import InstanceConfig from "./InstanceConfig";
import styles from "./PluginCardActions.module.css";
import type { PluginCard as PluginCardData } from "@/data/types";

interface Props {
  plugin: PluginCardData;
}

export default function PluginCardActions({ plugin }: Props) {
  const { installedIds, pendingIds } = useInstalledIds();
  const isInstalled = installedIds.has(plugin.id);
  const isPending = pendingIds.has(plugin.id);
  const [showConfig, setShowConfig] = useState(false);

  function buildRedirectUrl(instanceUrl: string): string {
    const detail = {
      id: plugin.id,
      npmPackage: plugin.npmPackage ?? plugin.id,
      name: plugin.name ?? plugin.id,
      description: plugin.description ?? "",
      version: plugin.version,
      format: plugin.format ?? "bundle",
      trust: plugin.trust ?? "unverified",
      capabilities: (plugin as any).capabilities ?? ["data:own"],
      category: plugin.category ?? "Custom",
      icon: plugin.icon ?? "Package",
      installs: plugin.installs ?? 0,
      author: plugin.author ?? "WorldWideView",
      tags: plugin.tags ?? [],
      updatedAt: plugin.updatedAt ?? "",
      longDescription: (plugin as any).longDescription ?? "",
      compatibility: (plugin as any).compatibility ?? ">=0.1.0",
      changelog: (plugin as any).changelog ?? "",
    };
    const manifest = getInstallManifest(detail);
    const manifestB64 = btoa(
      unescape(encodeURIComponent(JSON.stringify(manifest)))
    );
    const redirectTo = window.location.href.split("?")[0];

    const url = new URL(`${instanceUrl}/api/marketplace/install-redirect`);
    url.searchParams.set("pluginId", plugin.id);
    url.searchParams.set("version", plugin.version);
    url.searchParams.set("manifest", manifestB64);
    url.searchParams.set("redirectTo", redirectTo);
    return url.toString();
  }

  function handleInstall(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trackEvent("plugin_install_click", { pluginId: plugin.id });
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

  return (
    <>
      {showConfig && (
        <InstanceConfig
          onConfigured={handleConfigured}
          onCancel={() => setShowConfig(false)}
        />
      )}

      {isInstalled ? (
        <span className={styles.installedBadge}>✓ Installed</span>
      ) : isPending ? (
        <span className={styles.pendingBadge}>⏳ Pending</span>
      ) : (
        <button
          className={`${styles.btn} ${styles.install}`}
          onClick={handleInstall}
        >
          Install
        </button>
      )}
    </>
  );
}
