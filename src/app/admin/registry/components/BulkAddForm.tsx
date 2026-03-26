"use client";

import { useState } from "react";
import styles from "../page.module.css";

interface BulkAddFormProps {
  onAdd: (plugins: { id: string; name?: string }[]) => void;
}

export function BulkAddForm({ onAdd }: BulkAddFormProps) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [singleId, setSingleId] = useState("");
  const [singleName, setSingleName] = useState("");
  const [bulkText, setBulkText] = useState("");

  function handleSingleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!singleId.trim()) return;
    onAdd([{ id: singleId.trim(), name: singleName.trim() || undefined }]);
    setSingleId("");
    setSingleName("");
  }

  function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    const ids = bulkText
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    onAdd(ids.map((id) => ({ id })));
    setBulkText("");
  }

  return (
    <div className={styles.addSection}>
      <div className={styles.modeToggle}>
        <button
          className={`${styles.toggleBtn} ${mode === "single" ? styles.toggleActive : ""}`}
          onClick={() => setMode("single")}
        >
          Single
        </button>
        <button
          className={`${styles.toggleBtn} ${mode === "bulk" ? styles.toggleActive : ""}`}
          onClick={() => setMode("bulk")}
        >
          Bulk Add
        </button>
      </div>

      {mode === "single" ? (
        <form onSubmit={handleSingleAdd} className={styles.addForm}>
          <input
            placeholder="Plugin ID (e.g. aviation)"
            value={singleId}
            onChange={(e) => setSingleId(e.target.value)}
            className={styles.input}
          />
          <input
            placeholder="Display name (optional)"
            value={singleName}
            onChange={(e) => setSingleName(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.btnPrimary}>
            Add Plugin
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkAdd} className={styles.addForm}>
          <textarea
            placeholder="Paste plugin IDs (one per line or comma-separated)"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className={styles.textarea}
            rows={4}
          />
          <button type="submit" className={styles.btnPrimary}>
            Add All
          </button>
        </form>
      )}
    </div>
  );
}
