"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { KNOWN_PLUGINS } from "@/data/knownPlugins";
import PluginCard from "@/components/PluginCard";
import PluginIcon from "@/components/PluginIcon";
import styles from "./page.module.css";

const FEATURES = [
  {
    icon: "Plug",
    title: "Three Plugin Formats",
    desc: "JSON-only declarative configs, static data bundles, or full code plugins — pick the level of control you need.",
  },
  {
    icon: "ShieldCheck",
    title: "Verified & Sandboxed",
    desc: "Trusted built-in plugins get full control. Community plugins run sandboxed for safety.",
  },
  {
    icon: "Zap",
    title: "One-Click Install",
    desc: "Install any plugin straight from the marketplace into your WorldWideView instance. Coming soon.",
  },
];

const featuredPlugins = KNOWN_PLUGINS.filter((p) => p.id !== "sdk").slice(0, 3);

// Build PluginCard-shaped objects from known plugins for the homepage
const popularPlugins = featuredPlugins.map((p) => ({
  id: p.id,
  name: p.npmPackage.replace("@worldwideview/wwv-plugin-", "").split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
  description: p.longDescription.slice(0, 80),
  category: p.category,
  icon: p.icon,
  installs: 0,
  author: "WorldWideView",
  version: "",
  format: p.format,
  trust: p.trust,
  tags: [],
  updatedAt: "",
}));

export default function Home() {
  return (
    <>
      <section className={styles.hero}>
        <span className={styles.badge}>Marketplace</span>
        <h1>WorldWideView Marketplace</h1>
        <p>
          Browse, publish, and install data source plugins for the real-time 3D
          globe intelligence platform. Choose from declarative JSON configs,
          static data bundles, or full code plugins.
        </p>

        <div className={styles.ctas}>
          <Link
            href="/browse"
            className={styles.primaryCta}
            onClick={() => trackEvent("cta_click", { label: "Browse Plugins" })}
          >
            Browse Plugins →
          </Link>
          <span className={styles.secondaryCta}>
            Publish a Plugin
            <span className={styles.comingSoon}>Coming Soon</span>
          </span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>7</span>
            <span className={styles.statLabel}>Plugins</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>5</span>
            <span className={styles.statLabel}>Categories</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>3</span>
            <span className={styles.statLabel}>Formats</span>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Why WorldWideView Plugins?</h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}><PluginIcon name={f.icon} size={28} /></span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.popular}>
        <div className={styles.popularHeader}>
          <h2 className={styles.sectionTitle}>Popular Plugins</h2>
          <Link href="/browse" className={styles.viewAll}>
            View All →
          </Link>
        </div>
        <div className={styles.popularGrid}>
          {popularPlugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      </section>
    </>
  );
}
