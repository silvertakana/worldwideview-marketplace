"use client";

import { useState, type MouseEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import {
  getInstanceUrl,
  setInstanceUrl,
  fetchUserInstances,
  type SavedInstance,
} from "@/lib/instanceStore";
import InstancePicker from "./InstancePicker";
import { getInstallManifest } from "@/data/pluginManifests";
import { useInstalledIds } from "./InstalledPluginsProvider";
import InstanceConfig from "./InstanceConfig";
import styles from "./PluginCardActions.module.css";
import type { PluginCard as PluginCardData } from "@/data/types";

interface Props {
  plugin: PluginCardData;
  isAuthed?: boolean;
}

export default function PluginCardActions({ plugin, isAuthed }: Props) {
  const { installedIds, pendingIds } = useInstalledIds();
  const [showConfig, setShowConfig] = useState(false);
  const [pickerInstances, setPickerInstances] = useState<SavedInstance[] | null>(null);

  if (!plugin) return null;

  const isInstalled = installedIds.has(plugin.id);
  const isPending = pendingIds.has(plugin.id);

  // isAuthed === undefined means the auth check is still loading — show Install
  // optimistically to avoid flicker; the route will redirect to login if needed.
  if (isAuthed === false) {
    const loginUrl = `${process.env.NEXT_PUBLIC_AUTH_HOST_URL}/login?next=${
      typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""
    }`;
    return (
      <button
        className={`${styles.btn} ${styles.signIn}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = loginUrl;
        }}
      >
        Sign in to install
      </button>
    );
  }

  function buildInstallStartUrl(instanceUrl: string): string {
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
    const manifestB64 = btoa(unescape(encodeURIComponent(JSON.stringify(manifest))));
    const redirectTo = window.location.href.split("?")[0];

    const url = new URL("/api/install/start", window.location.origin);
    url.searchParams.set("pluginId", plugin.id);
    url.searchParams.set("version", plugin.version);
    url.searchParams.set("manifest", manifestB64);
    url.searchParams.set("instanceUrl", instanceUrl);
    url.searchParams.set("redirectTo", redirectTo);
    return url.toString();
  }

  function saveScrollAnchor() {
    sessionStorage.setItem("browse_scroll_plugin_id", plugin.id);
  }

  async function handleInstall(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trackEvent("plugin_install_click", { pluginId: plugin.id });

    const cached = getInstanceUrl();
    if (cached) {
      saveScrollAnchor();
      window.location.href = buildInstallStartUrl(cached);
      return;
    }

    const instances = await fetchUserInstances();
    if (instances.length === 1) {
      setInstanceUrl(instances[0].url);
      saveScrollAnchor();
      window.location.href = buildInstallStartUrl(instances[0].url);
      return;
    }
    if (instances.length > 1) {
      setPickerInstances(instances);
      return;
    }
    setShowConfig(true);
  }

  function handlePickerSelect(instance: SavedInstance) {
    setInstanceUrl(instance.url);
    setPickerInstances(null);
    saveScrollAnchor();
    window.location.href = buildInstallStartUrl(instance.url);
  }

  function handlePickerAddNew() {
    setPickerInstances(null);
    setShowConfig(true);
  }

  function handleConfigured() {
    setShowConfig(false);
    const instanceUrl = getInstanceUrl();
    if (instanceUrl) {
      saveScrollAnchor();
      window.location.href = buildInstallStartUrl(instanceUrl);
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

      {pickerInstances && (
        <InstancePicker
          instances={pickerInstances}
          onSelect={handlePickerSelect}
          onAddNew={handlePickerAddNew}
          onCancel={() => setPickerInstances(null)}
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
