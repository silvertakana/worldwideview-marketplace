import { notFound } from "next/navigation";
import Link from "next/link";
import { getPluginById } from "@/data/pluginService";
import { CAPABILITY_LABELS } from "@/data/capabilityLabels";
import PluginIcon from "@/components/PluginIcon";
import InstallButton from "@/components/InstallButton";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PluginDetailPage({ params }: Props) {
  const { id } = await params;
  const plugin = await getPluginById(id);
  if (!plugin) notFound();

  return (
    <div className={styles.page}>
      <Link href="/browse" className={styles.backLink}>
        ← Back to Browse
      </Link>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <span className={styles.heroIcon}>
          <PluginIcon name={plugin.icon} size={40} />
        </span>
        <div className={styles.heroInfo}>
          <h1 className={styles.heroName}>{plugin.name}</h1>
          <p className={styles.heroAuthor}>by {plugin.author}</p>
          <p className={styles.heroId}>ID: <code>{plugin.id}</code></p>
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
          <span className={styles.statValue}>{plugin.category}</span>
          <span className={styles.statLabel}>Category</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{plugin.compatibility}</span>
          <span className={styles.statLabel}>Compatibility</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{plugin.updatedAt}</span>
          <span className={styles.statLabel}>Updated</span>
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
            const info = CAPABILITY_LABELS[cap] ?? { icon: "Package", label: cap };
            return (
              <span key={cap} className={styles.capBadge}>
                <PluginIcon name={info.icon} size={14} /> {info.label}
              </span>
            );
          })}
        </div>
      </section>

      {/* ── Changelog ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Changelog</h2>
        <ul className={styles.changelog}>
          {(plugin.changelog ?? "").split(/\n/).filter(l => l.trim()).map((line, i) => {
            const text = line.replace(/^-\s*/, "");
            const parts = text.split(/\*\*(.+?)\*\*/g);
            return (
              <li key={i}>
                {parts.map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Install Button ── */}
      <InstallButton plugin={plugin} />
    </div>
  );
}

