"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LoginForm } from "./components/LoginForm";
import { Toolbar } from "./components/Toolbar";
import { BulkAddForm } from "./components/BulkAddForm";
import { PluginTable } from "./components/PluginTable";
import { ImportModal } from "./components/ImportModal";
import { DiscoveryModal } from "./components/DiscoveryModal";
import styles from "./page.module.css";

interface AdminPlugin {
  id: string;
  npmPackage: string;
  trust: string;
  addedAt: string;
}

export default function AdminRegistryPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [plugins, setPlugins] = useState<AdminPlugin[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
      (p) => p.id.toLowerCase().includes(q) || p.npmPackage.toLowerCase().includes(q)
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

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/cron/sync-npm");
      await fetchPlugins();
      alert("NPM sync completed!");
    } catch {
      alert("Failed to sync NPM cache.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd(items: { id: string }[]) {
    const res = await fetch("/api/admin/registry", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ plugins: items }),
    });
    if (res.ok) {
      const body = await res.json();
      if (body.errors && body.errors.length > 0) {
        alert("Some plugins failed to add:\n" + body.errors.map((e: any) => `- ${e.package}: ${e.error}`).join("\n"));
      } else {
        alert(`Successfully added ${body.plugins?.length || 0} plugin(s)!`);
      }
    } else {
      const body = await res.json();
      alert("Server error: " + (body.error || "Unknown"));
    }
    fetchPlugins();
  }

  async function handleUpdateTrust(id: string, trust: string) {
    await fetch("/api/admin/registry", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ ids: [id], trust }),
    });
    fetchPlugins();
  }

  async function handleBulkUpdateTrust(trust: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await fetch("/api/admin/registry", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ ids, trust }),
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

  function handleExport() {
    const jsonStr = JSON.stringify(plugins, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market-registry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(importPlugins: any[], mode: "merge" | "overwrite") {
    const res = await fetch("/api/admin/registry/import", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ plugins: importPlugins, mode }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.details || err.error || "Import failed");
    }
    await fetchPlugins();
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
          onUpdateSelected={handleBulkUpdateTrust}
          onExport={handleExport}
          onImportClick={() => setShowImportModal(true)}
          onDiscoverClick={() => setShowDiscoveryModal(true)}
          onSync={handleSync}
          syncing={syncing}
        />
        <BulkAddForm onAdd={handleAdd} />
        <PluginTable
          plugins={filtered}
          selected={selected}
          onToggle={toggleSelect}
          onToggleAll={toggleSelectAll}
          onUpdateTrust={handleUpdateTrust}
          onRemove={handleRemove}
        />
      </div>
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
      {showDiscoveryModal && (
        <DiscoveryModal
          onClose={() => setShowDiscoveryModal(false)}
          onImport={async (items) => {
            // Re-use handleAdd with discovery items, then auto-sync cache
            await handleAdd(items);
            await handleSync();
          }}
        />
      )}
    </div>
  );
}
