import Link from "next/link";
import type { PluginCard as PluginCardData } from "@/data/plugins";
import styles from "./PluginCard.module.css";

interface PluginCardProps {
  plugin: PluginCardData;
}

export default function PluginCard({ plugin }: PluginCardProps) {
  return (
    <Link href={`/browse/${plugin.id}`} className={styles.card}>
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
