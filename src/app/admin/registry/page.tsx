"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

interface VerifiedPlugin {
  id: string;
  name: string | null;
  addedAt: string;
}

export default function AdminRegistryPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [plugins, setPlugins] = useState<VerifiedPlugin[]>([]);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const token = typeof window !== "undefined"
    ? sessionStorage.getItem("admin_token") ?? ""
    : "";

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("admin_token") ?? ""}`,
  }), []);

  const fetchPlugins = useCallback(async () => {
    const res = await fetch("/api/admin/registry", { headers: headers() });
    if (!res.ok) { setAuthed(false); return; }
    const data = await res.json();
    setPlugins(data.plugins);
  }, [headers]);

  useEffect(() => {
    if (sessionStorage.getItem("admin_token")) {
      setAuthed(true);
      fetchPlugins();
    }
  }, [fetchPlugins]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("admin_token", password);
    const res = await fetch("/api/admin/registry", {
      headers: { Authorization: `Bearer ${password}` },
    });
    if (res.ok) {
      setAuthed(true);
      const data = await res.json();
      setPlugins(data.plugins);
      setError("");
    } else {
      setError("Invalid password");
      sessionStorage.removeItem("admin_token");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim()) return;
    await fetch("/api/admin/registry", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ id: newId.trim(), name: newName.trim() || null }),
    });
    setNewId("");
    setNewName("");
    fetchPlugins();
  }

  async function handleRemove(id: string) {
    await fetch("/api/admin/registry", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ id }),
    });
    fetchPlugins();
  }

  if (!authed) {
    return (
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <h1>🔒 Registry Admin</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
            <button type="submit" className={styles.btnPrimary}>Login</button>
          </form>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h1>Registry Admin</h1>
          <span className={styles.count}>{plugins.length} plugins</span>
        </div>

        <form onSubmit={handleAdd} className={styles.addForm}>
          <input
            placeholder="Plugin ID (e.g. aviation)"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            className={styles.input}
          />
          <input
            placeholder="Display name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.btnPrimary}>
            Add Plugin
          </button>
        </form>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Plugin ID</th>
              <th>Name</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {plugins.map((p) => (
              <tr key={p.id}>
                <td className={styles.mono}>{p.id}</td>
                <td>{p.name ?? "—"}</td>
                <td>{new Date(p.addedAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => handleRemove(p.id)}
                    className={styles.btnDanger}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
