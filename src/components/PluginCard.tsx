"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { useInstalledIds } from "./InstalledPluginsProvider";
import PluginIcon from "./PluginIcon";
import type { PluginCard as PluginCardData } from "@/data/types";
import styles from "./PluginCard.module.css";

interface PluginCardProps {
  plugin: PluginCardData;
}

export default function PluginCard({ plugin }: PluginCardProps) {
  const { installedIds } = useInstalledIds();
  const isInstalled = installedIds.has(plugin.id);

  function handleClick() {
    trackEvent("plugin_card_click", {
      pluginId: plugin.id,
      pluginName: plugin.name,
      category: plugin.category,
    });
  }

  return (
    <Link
      href={`/browse/${plugin.id}`}
      className={styles.card}
      onClick={handleClick}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}><PluginIcon name={plugin.icon} size={22} /></span>
        <span className={styles.cardName}>{plugin.name}</span>
      </div>
      <p className={styles.cardDesc}>{plugin.description}</p>
      <div className={styles.cardFooter}>
        <span className={styles.categoryBadge}>{plugin.category}</span>
        {isInstalled ? (
          <span className={styles.installedBadge}>✓ Installed</span>
        ) : (
          <span className={styles.installs}>
            {plugin.installs.toLocaleString()} installs
          </span>
        )}
      </div>
    </Link>
  );
}
