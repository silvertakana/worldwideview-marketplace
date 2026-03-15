"use client";

import { useState, useEffect } from "react";
import { getInstanceConfig } from "@/lib/instanceStore";
import { PLUGIN_DETAILS } from "@/data/pluginDetails";
import { getInstallManifest } from "@/data/pluginManifests";
import InstanceConfig from "./InstanceConfig";
import styles from "./InstallButton.module.css";

interface Props {
    pluginId: string;
    version: string;
}

type Status = "idle" | "loading" | "installed" | "error" | "configure";

export default function InstallButton({ pluginId, version }: Props) {
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [showConfig, setShowConfig] = useState(false);

    // Check if already installed on mount
    useEffect(() => {
        checkInstalled();
    }, [pluginId]);

    async function checkInstalled(): Promise<void> {
        const config = getInstanceConfig();
        if (!config) return;
        try {
            const res = await fetch(`${config.url}/api/marketplace/status`, {
                headers: { Authorization: `Bearer ${config.token}` },
                signal: AbortSignal.timeout(3000),
            });
            if (!res.ok) return;
            const data = await res.json();
            const found = data.plugins?.some((p: { pluginId: string }) => p.pluginId === pluginId);
            if (found) setStatus("installed");
        } catch { /* ignore — just show install button */ }
    }

    async function handleInstall() {
        const config = getInstanceConfig();
        if (!config) {
            setShowConfig(true);
            return;
        }

        setStatus("loading");
        setErrorMsg("");

        try {
            const res = await fetch(`${config.url}/api/marketplace/install`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.token}`,
                },
                body: JSON.stringify({
                    pluginId,
                    version,
                    manifest: getInstallManifest(
                        PLUGIN_DETAILS[pluginId] ?? { id: pluginId, version, format: "bundle", trust: "unverified", capabilities: [], category: "Custom", icon: "📦" }
                    ),
                }),
                signal: AbortSignal.timeout(10000),
            });

            if (res.ok) {
                setStatus("installed");
            } else if (res.status === 409) {
                setStatus("installed");
            } else {
                const data = await res.json().catch(() => ({}));
                setStatus("error");
                setErrorMsg(data.error || `Failed (${res.status})`);
            }
        } catch {
            setStatus("error");
            setErrorMsg("Could not connect to your instance");
        }
    }

    function handleConfigured() {
        setShowConfig(false);
        handleInstall();
    }

    return (
        <>
            {showConfig && (
                <InstanceConfig
                    onConfigured={handleConfigured}
                    onCancel={() => setShowConfig(false)}
                />
            )}

            {status === "installed" ? (
                <button className={`${styles.btn} ${styles.installed}`} disabled>
                    ✓ Installed
                </button>
            ) : status === "loading" ? (
                <button className={`${styles.btn} ${styles.loading}`} disabled>
                    Installing…
                </button>
            ) : (
                <button className={styles.btn} onClick={handleInstall}>
                    Install Plugin
                </button>
            )}

            {status === "error" && <p className={styles.error}>{errorMsg}</p>}
        </>
    );
}
