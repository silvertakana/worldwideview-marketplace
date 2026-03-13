import { notFound } from "next/navigation";
import Link from "next/link";
import { PLUGIN_DETAILS } from "@/data/pluginDetails";
import { CAPABILITY_LABELS } from "@/data/capabilityLabels";
import InstallButton from "@/components/InstallButton";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PluginDetailPage({ params }: Props) {
  const { id } = await params;
  const plugin = PLUGIN_DETAILS[id];
  if (!plugin) notFound();

  return (
    <div className={styles.page}>
      <Link href="/browse" className={styles.backLink}>
        ← Back to Browse
      </Link>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <span className={styles.heroIcon}>{plugin.icon}</span>
        <div className={styles.heroInfo}>
          <h1 className={styles.heroName}>{plugin.name}</h1>
          <p className={styles.heroAuthor}>by {plugin.author}</p>
          <div className={styles.badges}>
            <span className={styles.badgeVersion}>v{plugin.version}</span>
            <span className={styles.badgeFormat}>{plugin.format}</span>
            <span className={styles.badgeTrust}>{plugin.trust}</span>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{plugin.installs.toLocaleString()}</span>
          <span className={styles.statLabel}>Installs</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{plugin.category}</span>
          <span className={styles.statLabel}>Category</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{plugin.compatibility}</span>
          <span className={styles.statLabel}>Compatibility</span>
        </div>
      </section>

      {/* ── Description ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Description</h2>
        <p className={styles.description}>{plugin.longDescription}</p>
      </section>

      {/* ── Capabilities ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Capabilities</h2>
        <div className={styles.capList}>
          {plugin.capabilities.map((cap) => {
            const info = CAPABILITY_LABELS[cap] ?? { emoji: "📦", label: cap };
            return (
              <span key={cap} className={styles.capBadge}>
                {info.emoji} {info.label}
              </span>
            );
          })}
        </div>
      </section>

      {/* ── Changelog ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Changelog</h2>
        <p className={styles.changelog}>{plugin.changelog}</p>
      </section>

      {/* ── Install Button ── */}
      <InstallButton pluginId={plugin.id} version={plugin.version} />
    </div>
  );
}
