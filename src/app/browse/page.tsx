"use client";

import { useState } from "react";
import { PLUGINS, CATEGORIES, type Category } from "@/data/plugins";
import styles from "./page.module.css";

export default function BrowsePage() {
  const [active, setActive] = useState<Category>("All");

  const filtered =
    active === "All"
      ? PLUGINS
      : PLUGINS.filter((p) => p.category === active);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Browse Plugins</h1>

      <div className={styles.filters}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.filterBtn} ${
              active === cat ? styles.filterBtnActive : ""
            }`}
            onClick={() => setActive(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {filtered.map((plugin) => (
          <article key={plugin.id} className={styles.card}>
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
          </article>
        ))}
      </div>
    </div>
  );
}
