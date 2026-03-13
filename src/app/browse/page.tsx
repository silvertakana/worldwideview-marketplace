"use client";

import { useState } from "react";
import { CATEGORIES, type Category } from "@/data/plugins";
import { usePlugins } from "@/hooks/usePlugins";
import { useDebounce } from "@/hooks/useDebounce";
import PluginCard from "@/components/PluginCard";
import styles from "./page.module.css";

export default function BrowsePage() {
  const [active, setActive] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { plugins, loading, error } = usePlugins(active, debouncedQuery);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Browse Plugins</h1>

      <input
        type="search"
        placeholder="Search plugins…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={styles.searchInput}
        id="plugin-search"
      />

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
      ) : plugins.length === 0 ? (
        <div className={styles.empty}>
          <p>No plugins match your search.</p>
          {query && (
            <button
              className={styles.clearBtn}
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          )}
        </div>
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
