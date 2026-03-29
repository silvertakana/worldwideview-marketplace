"use client";

import { useState } from "react";
import styles from "../page.module.css";

interface ToolbarProps {
  totalCount: number;
  selectedCount: number;
  search: string;
  setSearch: (v: string) => void;
  onUpdateSelected: (trust: string) => void;
  onExport: () => void;
  onImportClick: () => void;
}

export function Toolbar({
  totalCount,
  selectedCount,
  search,
  setSearch,
  onUpdateSelected,
  onExport,
  onImportClick,
}: ToolbarProps) {
  const [confirmingReject, setConfirmingReject] = useState(false);

  function handleAction(trust: string) {
    if (trust === "rejected" && !confirmingReject) {
      setConfirmingReject(true);
      return;
    }
    onUpdateSelected(trust);
    setConfirmingReject(false);
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
        <button
          onClick={onExport}
          className={styles.btnSecondary}
          style={{ padding: "8px 16px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
        >
          Export
        </button>
        <button
          onClick={onImportClick}
          className={styles.btnSecondary}
          style={{ padding: "8px 16px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
        >
          Import
        </button>
        {selectedCount > 0 && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleAction("verified")}
              className={styles.btnPrimary}
            >
              Verify {selectedCount}
            </button>
            <button
              onClick={() => handleAction("rejected")}
              className={styles.btnDanger}
              onBlur={() => setConfirmingReject(false)}
            >
              {confirmingReject
                ? `Confirm reject ${selectedCount}?`
                : `Reject ${selectedCount}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
