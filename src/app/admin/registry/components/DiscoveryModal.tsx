"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";
import type { NpmPackageMeta } from "@/data/types";

interface DiscoveryModalProps {
  onClose: () => void;
  onImport: (items: { id: string; npmPackage: string }[]) => Promise<void>;
}

export function DiscoveryModal({ onClose, onImport }: DiscoveryModalProps) {
  const [plugins, setPlugins] = useState<NpmPackageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchDiscovered() {
      try {
        const authHeader = sessionStorage.getItem("admin_token") ?? "";
        const res = await fetch("/api/admin/registry/discover", {
          headers: { Authorization: `Bearer ${authHeader}` },
        });

        if (!res.ok) {
          throw new Error("Failed to search NPM for unregistered plugins.");
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setPlugins(data.discovered || []);
        // Select all by default
        setSelected(new Set((data.discovered || []).map((p: NpmPackageMeta) => p.name)));
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDiscovered();
  }, []);

  async function handleImportSubmit() {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    setError("");

    // Convert the selected npmPackage names to the required payload for bulk-add
    const payloads = Array.from(selected).map((npmPackage) => {
      // The API expects the `id` field to contain the full NPM package name
      // so it can look it up on the registry. The server then parses out the short id.
      return { id: npmPackage };
    });

    try {
      await onImport(payloads);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add plugins.");
      setIsSubmitting(false);
    }
  }

  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: "800px" }}>
        <h2>Discover NPM Plugins</h2>
        {loading ? (
          <p style={{ padding: "20px 0" }}>Scanning NPM Registry for wwv-plugin-* ...</p>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : plugins.length === 0 ? (
          <p style={{ padding: "20px 0" }}>
            No new unregistered plugins were found on the NPM registry matching the prefix.
          </p>
        ) : (
          <>
            <p style={{ marginBottom: "16px" }}>
              Found {plugins.length} active package(s) on NPM that are not currently in your local registry database.
            </p>
            <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #333", borderRadius: "8px", marginBottom: "16px" }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selected.size === plugins.length}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? new Set(plugins.map((p) => p.name))
                              : new Set()
                          )
                        }
                      />
                    </th>
                    <th>Package / Description</th>
                    <th>Publish Info</th>
                  </tr>
                </thead>
                <tbody>
                  {plugins.map((pkg) => (
                    <tr key={pkg.name}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(pkg.name)}
                          onChange={() => toggleSelect(pkg.name)}
                        />
                      </td>
                      <td>
                        <strong style={{ fontSize: "1rem" }}>{pkg.name}</strong>
                        <div style={{ fontSize: "0.85rem", color: "#aaa", marginTop: "4px" }}>
                          {pkg.description || "No description provided."}
                        </div>
                      </td>
                      <td>
                        <span className={styles.tag} style={{ marginBottom: "4px" }}>v{pkg.version}</span>
                        <div style={{ fontSize: "0.8rem", color: "#666" }}>
                          by {pkg.author}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
            Cancel
          </button>
          {!loading && plugins.length > 0 && (
            <button
              onClick={handleImportSubmit}
              className={styles.btnPrimary}
              disabled={isSubmitting || selected.size === 0}
            >
              {isSubmitting ? "Importing..." : `Add ${selected.size} Plugins to Registry`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
