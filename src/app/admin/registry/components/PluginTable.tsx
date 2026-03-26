"use client";

import styles from "../page.module.css";

interface VerifiedPlugin {
  id: string;
  name: string | null;
  addedAt: string;
}

interface PluginTableProps {
  plugins: VerifiedPlugin[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onRemove: (id: string) => void;
}

export function PluginTable({
  plugins,
  selected,
  onToggle,
  onToggleAll,
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
          <th>Name</th>
          <th>Added</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {plugins.map((p) => (
          <tr key={p.id} className={selected.has(p.id) ? styles.selectedRow : ""}>
            <td className={styles.checkCol}>
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => onToggle(p.id)}
                className={styles.checkbox}
              />
            </td>
            <td className={styles.mono}>{p.id}</td>
            <td>{p.name ?? "—"}</td>
            <td>{new Date(p.addedAt).toLocaleDateString()}</td>
            <td>
              <button
                onClick={() => onRemove(p.id)}
                className={styles.btnDangerSmall}
              >
                Remove
              </button>
            </td>
          </tr>
        ))}
        {plugins.length === 0 && (
          <tr>
            <td colSpan={5} className={styles.emptyRow}>
              No plugins found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
