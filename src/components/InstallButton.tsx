"use client";

import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
    getInstanceUrl,
    setInstanceUrl,
    setMarketplaceToken,
    getMarketplaceToken,
    fetchUserInstances,
    type SavedInstance,
} from "@/lib/instanceStore";
import { KNOWN_PLUGINS } from "@/data/knownPlugins";
import { getInstallManifest } from "@/data/pluginManifests";
import { useInstalledIds } from "./InstalledPluginsProvider";
import InstanceConfig from "./InstanceConfig";
import InstancePicker from "./InstancePicker";
import styles from "./InstallButton.module.css";
import type { PluginDetail } from "@/data/types";

interface Props {
    plugin: PluginDetail;
    isAuthed: boolean;
}

type Status = "idle" | "installed" | "configure" | "uninstalling";

export default function InstallButton({ plugin, isAuthed }: Props) {
    const { installedIds, refetch } = useInstalledIds();
    const [status, setStatus] = useState<Status>("idle");
    const [showConfig, setShowConfig] = useState(false);
    const [pickerInstances, setPickerInstances] = useState<SavedInstance[] | null>(null);
    const [errorMsg, setErrorMsg] = useState("");



    // Sync status from context (already-installed plugins). Deferred into a
    // promise callback so no synchronous setState happens inside the effect body.
    useEffect(() => {
        if (!plugin) return;
        Promise.resolve().then(() => {
            if (installedIds.has(plugin.id)) {
                setStatus("installed");
            } else {
                setStatus("idle");
            }
        });
    }, [installedIds, plugin?.id]);

    // Detect return from WWV install redirect (?installed=pluginId + #token=<jwt>)
    useEffect(() => {
        if (!plugin) return;
        const params = new URLSearchParams(window.location.search);
        const clean = new URL(window.location.href);

        if (params.get("installed") === plugin.id) {
            // Deferred so no synchronous setState happens inside the effect body.
            Promise.resolve().then(() => setStatus("installed"));
            trackEvent("plugin_install_success", { pluginId: plugin.id });
            clean.searchParams.delete("installed");
            refetch(); // refresh the shared context
        }
        // Read token from URL fragment (never sent to server)
        const hash = window.location.hash;
        const tokenMatch = hash.match(/[#&]token=([^&]*)/);
        if (tokenMatch?.[1]) {
            setMarketplaceToken(tokenMatch[1]);
        }
        if (params.get("install_error") === plugin.id) {
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
    }, [plugin?.id]);

    if (!plugin) return null;

    if (!isAuthed) {
        const loginUrl = `${process.env.NEXT_PUBLIC_AUTH_HOST_URL}/login?next=${
            typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""
        }`;
        return (
            <div className={styles.authPrompt}>
                <Package size={20} className={styles.authIcon} />
                <p className={styles.authMessage}>Sign in to install and track your plugins</p>
                <a href={loginUrl} className={styles.authSignIn}>Sign In</a>
            </div>
        );
    }

    function buildInstallStartUrl(instanceUrl: string): string {
        const detail = {
            id: plugin.id,
            npmPackage: plugin.npmPackage ?? plugin.id,
            name: plugin.name ?? plugin.id,
            description: plugin.description ?? "",
            version: plugin.version,
            format: plugin.format ?? "bundle",
            trust: plugin.trust ?? "unverified",
            capabilities: plugin.capabilities ?? ["data:own"],
            category: plugin.category ?? "Custom",
            icon: plugin.icon ?? "Package",
            installs: plugin.installs ?? 0,
            author: plugin.author ?? "WorldWideView",
            tags: plugin.tags ?? [],
            updatedAt: plugin.updatedAt ?? "",
            longDescription: plugin.longDescription ?? "",
            compatibility: plugin.compatibility ?? ">=0.1.0",
            changelog: plugin.changelog ?? "",
        };
        const manifest = getInstallManifest(detail);
        const manifestB64 = btoa(unescape(encodeURIComponent(JSON.stringify(manifest))));
        const redirectTo = window.location.href.split("?")[0];

        const url = new URL("/api/install/start", window.location.origin);
        url.searchParams.set("pluginId", plugin.id);
        url.searchParams.set("version", plugin.version);
        url.searchParams.set("manifest", manifestB64);
        url.searchParams.set("instanceUrl", instanceUrl);
        url.searchParams.set("redirectTo", redirectTo);
        return url.toString();
    }

    async function handleInstall() {
        trackEvent("plugin_install_click", { pluginId: plugin.id });

        const cached = getInstanceUrl();
        if (cached) {
            window.location.href = buildInstallStartUrl(cached);
            return;
        }

        // No cached URL — try the server (logged-in users with linked instances
        // get the silent path; anonymous / new users fall through to the modal).
        const instances = await fetchUserInstances();
        if (instances.length === 1) {
            setInstanceUrl(instances[0].url);
            window.location.href = buildInstallStartUrl(instances[0].url);
            return;
        }
        if (instances.length > 1) {
            setPickerInstances(instances);
            return;
        }
        setShowConfig(true);
    }

    function handlePickerSelect(instance: SavedInstance) {
        setInstanceUrl(instance.url);
        setPickerInstances(null);
        window.location.href = buildInstallStartUrl(instance.url);
    }

    function handlePickerAddNew() {
        setPickerInstances(null);
        setShowConfig(true);
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
                body: JSON.stringify({ pluginId: plugin.id }),
                signal: AbortSignal.timeout(10000),
            });

            if (res.ok) {
                trackEvent("plugin_uninstall_success", { pluginId: plugin.id });
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

            {pickerInstances && (
                <InstancePicker
                    instances={pickerInstances}
                    onSelect={handlePickerSelect}
                    onAddNew={handlePickerAddNew}
                    onCancel={() => setPickerInstances(null)}
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

