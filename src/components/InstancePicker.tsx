"use client";

import { createPortal } from "react-dom";
import type { SavedInstance } from "@/lib/instanceStore";
import styles from "./InstancePicker.module.css";

interface Props {
    instances: SavedInstance[];
    onSelect: (instance: SavedInstance) => void;
    onAddNew: () => void;
    onCancel: () => void;
}

function displayLabel(instance: SavedInstance): string {
    if (instance.nickname && instance.nickname.trim().length > 0) {
        return instance.nickname;
    }
    try {
        return new URL(instance.url).host;
    } catch {
        return instance.url;
    }
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

export default function InstancePicker({ instances, onSelect, onAddNew, onCancel }: Props) {
    return createPortal(
        <div
            className={styles.overlay}
            onClick={(e) => { e.preventDefault(); onCancel(); }}
        >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>Choose your instance</h2>
                <p className={styles.subtitle}>
                    You have multiple WorldWideView instances saved. Pick the one
                    to install this plugin into.
                </p>

                <div className={styles.list}>
                    {instances.map((instance) => (
                        <button
                            key={instance.id}
                            type="button"
                            className={styles.item}
                            onClick={() => onSelect(instance)}
                        >
                            <div className={styles.itemMain}>
                                <span className={styles.itemTitle}>{displayLabel(instance)}</span>
                                <span className={styles.itemUrl}>{instance.url}</span>
                            </div>
                            <span className={styles.itemMeta}>
                                {formatLastUsed(instance.lastUsedAt)}
                            </span>
                        </button>
                    ))}
                </div>

                <div className={styles.actions}>
                    <button type="button" className={styles.btnLink} onClick={onAddNew}>
                        Use a different URL
                    </button>
                    <button type="button" className={styles.btnSecondary} onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
