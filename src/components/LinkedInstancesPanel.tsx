"use client";

import { useEffect, useState } from "react";
import { fetchUserInstances, type SavedInstance, clearInstanceUrl, getInstanceUrl } from "@/lib/instanceStore";
import styles from "./LinkedInstancesPanel.module.css";

interface Props {
    /** Called when the user clicks "Add an instance" so the host page can open `InstanceConfig`. */
    onAddInstance: () => void;
}

function formatLastUsed(iso: string): string {
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return "";
    const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function derivedNickname(instance: SavedInstance): string {
    try {
        return new URL(instance.url).host;
    } catch {
        return instance.url;
    }
}

export default function LinkedInstancesPanel({ onAddInstance }: Props) {
    const [instances, setInstances] = useState<SavedInstance[] | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    async function refresh() {
        const list = await fetchUserInstances();
        setInstances(list);
    }

    useEffect(() => {
        refresh();
    }, []);

    async function handleDelete(instance: SavedInstance) {
        if (!confirm(`Remove "${instance.nickname ?? derivedNickname(instance)}" from your saved instances?`)) {
            return;
        }
        await fetch(`/api/instances/${instance.id}`, { method: "DELETE" });
        // If we're deleting the one currently in localStorage, clear it so the
        // next install prompts again instead of pointing at a forgotten URL.
        if (getInstanceUrl() === instance.url) clearInstanceUrl();
        await refresh();
    }

    async function commitNickname(instance: SavedInstance) {
        const trimmed = editValue.trim();
        const next = trimmed.length === 0 ? null : trimmed;
        if (next === (instance.nickname ?? null)) {
            setEditingId(null);
            return;
        }
        await fetch(`/api/instances/${instance.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ nickname: next }),
        });
        setEditingId(null);
        await refresh();
    }

    // Anonymous users get an empty list — don't render the section at all
    // (the page-level "Connect Your Instance" empty state covers them).
    if (instances === null || instances.length === 0) return null;

    return (
        <section className={styles.section}>
            <div className={styles.heading}>
                <h2 className={styles.title}>Your linked instances</h2>
            </div>
            <p className={styles.subtitle}>
                Instances you{"'"}ve installed plugins to. We{"'"}ll auto-detect these
                when you click Install on a plugin.
            </p>

            <div className={styles.list}>
                {instances.map((instance) => (
                    <div key={instance.id} className={styles.row}>
                        <div className={styles.rowMain}>
                            <input
                                className={styles.nicknameInput}
                                value={
                                    editingId === instance.id
                                        ? editValue
                                        : (instance.nickname ?? derivedNickname(instance))
                                }
                                onFocus={() => {
                                    setEditingId(instance.id);
                                    setEditValue(instance.nickname ?? "");
                                }}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => editingId === instance.id && commitNickname(instance)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    if (e.key === "Escape") setEditingId(null);
                                }}
                                placeholder={derivedNickname(instance)}
                            />
                            <span className={styles.url}>{instance.url}</span>
                        </div>
                        <span className={styles.meta}>{formatLastUsed(instance.lastUsedAt)}</span>
                        <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(instance)}
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            <button type="button" className={styles.addBtn} onClick={onAddInstance}>
                + Add another instance
            </button>
        </section>
    );
}
