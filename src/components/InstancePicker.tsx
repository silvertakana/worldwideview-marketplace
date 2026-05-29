"use client";

import { createPortal } from "react-dom";
import { type SavedInstance } from "@/lib/instanceStore";
import styles from "./InstancePicker.module.css";

interface Props {
    instances: SavedInstance[];
    onSelect: (instance: SavedInstance) => void;
    onAddNew: () => void;
    onCancel: () => void;
}

export default function InstancePicker({ instances, onSelect, onAddNew, onCancel }: Props) {
    return createPortal(
        <div className={styles.overlay} onClick={(e) => { e.stopPropagation(); onCancel(); }}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>Choose an Instance</h2>
                <p className={styles.subtitle}>
                    Select a WorldWideView instance to install this plugin to.
                </p>

                <ul className={styles.list}>
                    {instances.map((instance) => (
                        <li key={instance.id} className={styles.item}>
                            <div>
                                <span className={styles.instanceUrl}>{instance.url}</span>
                                {instance.nickname && (
                                    <span className={styles.instanceNickname}>{instance.nickname}</span>
                                )}
                            </div>
                            <button
                                className={styles.btnSelect}
                                onClick={(e) => { e.stopPropagation(); onSelect(instance); }}
                            >
                                Use This
                            </button>
                        </li>
                    ))}
                </ul>

                <button
                    className={styles.btnAddNew}
                    onClick={(e) => { e.stopPropagation(); onAddNew(); }}
                >
                    Add New Instance
                </button>

                <button
                    className={styles.btnCancel}
                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                >
                    Cancel
                </button>
            </div>
        </div>,
        document.body
    );
}
