"use client";

import { useState } from "react";
import styles from "../page.module.css";

interface ImportModalProps {
  onClose: () => void;
  onImport: (plugins: any[], mode: "overwrite" | "merge") => Promise<void>;
}

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [mode, setMode] = useState<"merge" | "overwrite">("merge");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setJsonText(text);
        setError(""); // Clear any previous errors on success
      }
    };
    reader.onerror = () => {
      setError("Failed to read the selected file.");
    };
    reader.readAsText(file);
    // Reset the input value so the same file can be selected again
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!jsonText.trim()) {
      setError("Please paste the JSON registry array.");
      return;
    }

    let parsed: any[];
    try {
      parsed = JSON.parse(jsonText);
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
      return;
    }

    if (!Array.isArray(parsed)) {
      setError("JSON root must be an array of plugins.");
      return;
    }

    if (parsed.length > 0 && (!parsed[0].id || !parsed[0].npmPackage)) {
      setError("Parsed items do not look like valid plugins (missing id or npmPackage).");
      return;
    }

    setIsSubmitting(true);
    try {
      await onImport(parsed, mode);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to import plugins.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Import Registry JSON</h2>
        <form onSubmit={handleSubmit} className={styles.importForm}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
            <label className={styles.btnSecondary} style={{ cursor: "pointer", fontSize: "0.85rem", padding: "8px 16px" }}>
              Choose JSON File
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                disabled={isSubmitting}
              />
            </label>
            <span style={{ color: "#aaa", fontSize: "0.85rem" }}>or paste below:</span>
          </div>
          <textarea
            placeholder="[ { &quot;id&quot;: &quot;...&quot;, &quot;npmPackage&quot;: &quot;...&quot; }, ... ]"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className={styles.textarea}
            rows={10}
            disabled={isSubmitting}
          />
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
                disabled={isSubmitting}
              />
              <strong>Merge (Upsert):</strong> Add new plugins, update existing matchers, keep everything else.
            </label>
            <label className={`${styles.radioLabel} ${styles.radioLabelDanger}`}>
              <input
                type="radio"
                name="importMode"
                value="overwrite"
                checked={mode === "overwrite"}
                onChange={() => setMode("overwrite")}
                disabled={isSubmitting}
              />
              <strong>Overwrite Entirely:</strong> Delete ALL existing plugins and ONLY load these ones.
            </label>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "Importing..." : "Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
