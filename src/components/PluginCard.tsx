"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import PluginIcon from "./PluginIcon";
import PluginCardActions from "./PluginCardActions";
import TrustBadge from "./TrustBadge";
import type { PluginCard as PluginCardData } from "@/data/types";
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
        <span className={styles.cardIcon}><PluginIcon name={plugin.icon} size={22} /></span>
        <span className={styles.cardName}>{plugin.name}</span>
        <TrustBadge trust={plugin.trust} />
      </div>
      <p className={styles.cardDesc}>{plugin.description}</p>
      <div className={styles.cardFooter}>
        <span className={styles.categoryBadge}>{plugin.category}</span>
        <PluginCardActions plugin={plugin} />
      </div>
    </Link>
  );
}
