"use client";

import { useState } from "react";
import styles from "../page.module.css";

interface ToolbarProps {
  totalCount: number;
  selectedCount: number;
  search: string;
  setSearch: (v: string) => void;
  onRemoveSelected: () => void;
}

export function Toolbar({
  totalCount,
  selectedCount,
  search,
  setSearch,
  onRemoveSelected,
}: ToolbarProps) {
  const [confirming, setConfirming] = useState(false);

  function handleRemoveClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onRemoveSelected();
    setConfirming(false);
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <h1>Registry Admin</h1>
        <span className={styles.count}>{totalCount} plugins</span>
      </div>
      <div className={styles.toolbarRight}>
        <input
          type="text"
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${styles.input} ${styles.searchInput}`}
        />
        {selectedCount > 0 && (
          <button
            onClick={handleRemoveClick}
            className={styles.btnDanger}
            onBlur={() => setConfirming(false)}
          >
            {confirming
              ? `Confirm remove ${selectedCount}?`
              : `Remove ${selectedCount} selected`}
          </button>
        )}
      </div>
    </div>
  );
}
