"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LoginForm } from "./components/LoginForm";
import { Toolbar } from "./components/Toolbar";
import { BulkAddForm } from "./components/BulkAddForm";
import { PluginTable } from "./components/PluginTable";
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
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("admin_token") ?? ""}`,
  }), []);

  const fetchPlugins = useCallback(async () => {
    const res = await fetch("/api/admin/registry", { headers: headers() });
    if (!res.ok) { setAuthed(false); return; }
    const data = await res.json();
    setPlugins(data.plugins);
    setSelected(new Set());
  }, [headers]);

  useEffect(() => {
    if (sessionStorage.getItem("admin_token")) {
      setAuthed(true);
      fetchPlugins();
    }
  }, [fetchPlugins]);

  const filtered = useMemo(() => {
    if (!search.trim()) return plugins;
    const q = search.toLowerCase();
    return plugins.filter(
      (p) => p.id.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
    );
  }, [plugins, search]);

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

  async function handleAdd(items: { id: string; name?: string }[]) {
    await fetch("/api/admin/registry", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ plugins: items }),
    });
    fetchPlugins();
  }

  async function handleRemove(id: string) {
    await fetch("/api/admin/registry", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ ids: [id] }),
    });
    fetchPlugins();
  }

  async function handleRemoveSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await fetch("/api/admin/registry", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ ids }),
    });
    fetchPlugins();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (filtered.every((p) => selected.has(p.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  if (!authed) {
    return (
      <LoginForm
        password={password}
        setPassword={setPassword}
        onLogin={handleLogin}
        error={error}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <Toolbar
          totalCount={plugins.length}
          selectedCount={selected.size}
          search={search}
          setSearch={setSearch}
          onRemoveSelected={handleRemoveSelected}
        />
        <BulkAddForm onAdd={handleAdd} />
        <PluginTable
          plugins={filtered}
          selected={selected}
          onToggle={toggleSelect}
          onToggleAll={toggleSelectAll}
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
}
