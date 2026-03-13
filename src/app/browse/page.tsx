"use client";

import { useState } from "react";
import { CATEGORIES, type Category } from "@/data/plugins";
import { usePlugins } from "@/hooks/usePlugins";
import PluginCard from "@/components/PluginCard";
import styles from "./page.module.css";

export default function BrowsePage() {
  const [active, setActive] = useState<Category>("All");
  const { plugins, loading, error } = usePlugins(active);

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

      {error && <p className={styles.error}>Failed to load plugins.</p>}

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : (
        <div className={styles.grid}>
          {plugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      )}
    </div>
  );
}

