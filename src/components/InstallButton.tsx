"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import {
    getInstanceUrl,
    setMarketplaceToken,
    getMarketplaceToken,
} from "@/lib/instanceStore";
import { KNOWN_PLUGINS } from "@/data/knownPlugins";
import { getInstallManifest } from "@/data/pluginManifests";
import { useInstalledIds } from "./InstalledPluginsProvider";
import InstanceConfig from "./InstanceConfig";
import styles from "./InstallButton.module.css";

interface Props {
    pluginId: string;
    version: string;
}

type Status = "idle" | "installed" | "configure" | "uninstalling";

export default function InstallButton({ pluginId, version }: Props) {
    const { installedIds, refetch } = useInstalledIds();
    const [status, setStatus] = useState<Status>("idle");
    const [showConfig, setShowConfig] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Sync status from context (already-installed plugins)
    useEffect(() => {
        if (installedIds.has(pluginId)) {
            setStatus("installed");
        } else {
            setStatus("idle");
        }
    }, [installedIds, pluginId]);

    // Detect return from WWV install redirect (?installed=pluginId + #token=<jwt>)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const clean = new URL(window.location.href);

        if (params.get("installed") === pluginId) {
            setStatus("installed");
            trackEvent("plugin_install_success", { pluginId });
            clean.searchParams.delete("installed");
            refetch(); // refresh the shared context
        }
        // Read token from URL fragment (never sent to server)
        const hash = window.location.hash;
        const tokenMatch = hash.match(/[#&]token=([^&]*)/);
        if (tokenMatch?.[1]) {
            setMarketplaceToken(tokenMatch[1]);
        }
        if (params.get("install_error") === pluginId) {
            clean.searchParams.delete("install_error");
        }
        // Clean URL: remove handled query params and fragment
        clean.hash = "";
        if (
            params.has("installed") ||
            params.has("install_error") ||
            tokenMatch
        ) {
            window.history.replaceState({}, "", clean.toString());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pluginId]);

    function buildRedirectUrl(instanceUrl: string): string {
        const known = KNOWN_PLUGINS.find((p) => p.id === pluginId);
        const detail = {
            id: pluginId,
            name: known?.npmPackage ?? pluginId,
            description: known?.longDescription ?? "",
            version,
            format: known?.format ?? "bundle",
            trust: known?.trust ?? "unverified",
            capabilities: known?.capabilities ?? ["data:own"],
            category: known?.category ?? "Custom",
            icon: known?.icon ?? "Package",
            installs: 0,
            author: "WorldWideView",
            tags: [],
            updatedAt: "",
            longDescription: known?.longDescription ?? "",
            compatibility: ">=0.1.0",
            changelog: known?.changelog ?? "",
        };
        const manifest = getInstallManifest(detail);
        const manifestB64 = btoa(unescape(encodeURIComponent(JSON.stringify(manifest))));
        const redirectTo = window.location.href.split("?")[0];

        const url = new URL(`${instanceUrl}/api/marketplace/install-redirect`);
        url.searchParams.set("pluginId", pluginId);
        url.searchParams.set("version", version);
        url.searchParams.set("manifest", manifestB64);
        url.searchParams.set("redirectTo", redirectTo);
        return url.toString();
    }

    function handleInstall() {
        trackEvent("plugin_install_click", { pluginId });
        const instanceUrl = getInstanceUrl();
        if (!instanceUrl) {
            setShowConfig(true);
            return;
        }
        window.location.href = buildRedirectUrl(instanceUrl);
    }

    async function handleUninstall() {
        const instanceUrl = getInstanceUrl();
        if (!instanceUrl) return;

        setStatus("uninstalling");
        setErrorMsg("");

        try {
            const res = await fetch(`${instanceUrl}/api/marketplace/uninstall`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(getMarketplaceToken()
                        ? { Authorization: `Bearer ${getMarketplaceToken()}` }
                        : {}),
                },
                body: JSON.stringify({ pluginId }),
                signal: AbortSignal.timeout(10000),
            });

            if (res.ok) {
                trackEvent("plugin_uninstall_success", { pluginId });
                setStatus("idle");
                refetch();
            } else {
                const data = await res.json().catch(() => ({}));
                setErrorMsg(data.error || `Failed (${res.status})`);
                setStatus("installed");
            }
        } catch {
            setErrorMsg("Could not connect to your instance");
            setStatus("installed");
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
                <button className={`${styles.btn} ${styles.uninstall}`} onClick={handleUninstall}>
                    Uninstall Plugin
                </button>
            ) : status === "uninstalling" ? (
                <button className={`${styles.btn} ${styles.loading}`} disabled>
                    Removing…
                </button>
            ) : (
                <button className={styles.btn} onClick={handleInstall}>
                    Install Plugin
                </button>
            )}

            {errorMsg && <p className={styles.error}>{errorMsg}</p>}
        </>
    );
}

