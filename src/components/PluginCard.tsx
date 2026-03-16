"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import type { PluginCard as PluginCardData } from "@/data/plugins";
import styles from "./PluginCard.module.css";

interface PluginCardProps {
  plugin: PluginCardData;
}

export default function PluginCard({ plugin }: PluginCardProps) {
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
        <span className={styles.cardIcon}>{plugin.icon}</span>
        <span className={styles.cardName}>{plugin.name}</span>
      </div>
      <p className={styles.cardDesc}>{plugin.description}</p>
      <div className={styles.cardFooter}>
        <span className={styles.categoryBadge}>{plugin.category}</span>
        <span className={styles.installs}>
          {plugin.installs.toLocaleString()} installs
        </span>
      </div>
    </Link>
  );
}

