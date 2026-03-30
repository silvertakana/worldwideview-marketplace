"use client";

import { useState } from "react";
import styles from "../page.module.css";

interface AdminPlugin {
  id: string;
  npmPackage: string;
  trust: string;
  addedAt: string;
}

interface PluginTableProps {
  plugins: AdminPlugin[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onUpdateTrust: (id: string, trust: string) => void;
  onRemove: (id: string) => void;
}

function PluginTableRow({
  plugin: p,
  selected,
  onToggle,
  onUpdateTrust,
  onRemove,
}: {
  plugin: AdminPlugin;
  selected: boolean;
  onToggle: (id: string) => void;
  onUpdateTrust: (id: string, trust: string) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [npmData, setNpmData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExpand() {
    if (!expanded && !npmData && !loading) {
      setLoading(true);
      setError(null);
      try {
        const token = sessionStorage.getItem("admin_token") ?? "";
        const res = await fetch(`/api/admin/npm-cache?pkg=${encodeURIComponent(p.npmPackage)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch cache");
        setNpmData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  }

  return (
    <>
      <tr className={selected ? styles.selectedRow : ""}>
        <td className={styles.checkCol}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(p.id)}
            className={styles.checkbox}
          />
        </td>
        <td className={styles.mono}>{p.id}</td>
        <td className={styles.mono}>{p.npmPackage}</td>
        <td>
          <select
            value={p.trust}
            onChange={(e) => onUpdateTrust(p.id, e.target.value)}
            className={styles.input}
            style={{ padding: "4px", fontSize: "0.9rem" }}
          >
            <option value="built-in">built-in</option>
            <option value="verified">verified</option>
            <option value="unverified">unverified</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
        </td>
        <td>{new Date(p.addedAt).toLocaleDateString()}</td>
        <td style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={handleExpand}
            className={styles.btnPrimary}
            style={{ padding: "4px 8px", fontSize: "0.8rem" }}
          >
            {expanded ? "▲" : "▼"} Info
          </button>
          <button
            onClick={() => onRemove(p.id)}
            className={styles.btnDangerSmall}
          >
            Remove
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: "16px 24px", backgroundColor: "rgba(0,0,0,0.2)", borderBottom: "1px solid #2a2a4a", borderTop: "1px solid #2a2a4a" }}>
            {loading ? (
              <span style={{ color: "#888", fontSize: "0.9rem" }}>Loading NPM data...</span>
            ) : error ? (
              <span style={{ color: "#ef4444", fontSize: "0.9rem" }}>Error: {error}</span>
            ) : npmData ? (
              <div style={{ fontSize: "0.9rem", color: "#ccc", lineHeight: "1.6" }}>
                <strong style={{ color: "#e0e0e0" }}>Version:</strong> {npmData.version || "Unknown"} <br />
                <strong style={{ color: "#e0e0e0" }}>Description:</strong> {npmData.description || "No description"} <br />
                <strong style={{ color: "#e0e0e0" }}>Author:</strong> {npmData.author || "Unknown"} <br />
                <strong style={{ color: "#e0e0e0" }}>Updated At:</strong> {npmData.updatedAt || "Unknown"} <br />
                <strong style={{ color: "#e0e0e0" }}>Cached At:</strong> {new Date(npmData.crawledAt).toLocaleString()} <br />
                <strong style={{ color: "#e0e0e0" }}>Keywords:</strong>{" "}
                {npmData.keywords?.join(", ") || "None"}
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}

export function PluginTable({
  plugins,
  selected,
  onToggle,
  onToggleAll,
  onUpdateTrust,
  onRemove,
}: PluginTableProps) {
  const allSelected = plugins.length > 0 && plugins.every((p) => selected.has(p.id));

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.checkCol}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              className={styles.checkbox}
            />
          </th>
          <th>Plugin ID</th>
          <th>NPM Package</th>
          <th>Trust Level</th>
          <th>Added</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {plugins.map((p) => (
          <PluginTableRow
            key={p.id}
            plugin={p}
            selected={selected.has(p.id)}
            onToggle={onToggle}
            onUpdateTrust={onUpdateTrust}
            onRemove={onRemove}
          />
        ))}
        {plugins.length === 0 && (
          <tr>
            <td colSpan={6} className={styles.emptyRow}>
              No plugins found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
