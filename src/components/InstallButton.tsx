"use client";

import { useState, useEffect } from "react";
import { getInstanceUrl, setMarketplaceToken } from "@/lib/instanceStore";
import { PLUGIN_DETAILS } from "@/data/pluginDetails";
import { getInstallManifest } from "@/data/pluginManifests";
import InstanceConfig from "./InstanceConfig";
import styles from "./InstallButton.module.css";

interface Props {
    pluginId: string;
    version: string;
}

type Status = "idle" | "installed" | "configure";

export default function InstallButton({ pluginId, version }: Props) {
    const [status, setStatus] = useState<Status>("idle");
    const [showConfig, setShowConfig] = useState(false);

    // Detect return from WWV install redirect (?installed=pluginId&token=<jwt>)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const clean = new URL(window.location.href);

        if (params.get("installed") === pluginId) {
            setStatus("installed");
            clean.searchParams.delete("installed");
        }
        // Persist the marketplace JWT for Manage-page API calls
        const token = params.get("token");
        if (token) {
            setMarketplaceToken(token);
            clean.searchParams.delete("token");
        }
        if (params.get("install_error") === pluginId) {
            clean.searchParams.delete("install_error");
        }
        // Clean all handled params from URL in one replace
        if (
            params.has("installed") ||
            params.has("token") ||
            params.has("install_error")
        ) {
            window.history.replaceState({}, "", clean.toString());
        }
    }, [pluginId]);

    function buildRedirectUrl(instanceUrl: string): string {
        const detail = PLUGIN_DETAILS[pluginId] ?? {
            id: pluginId, name: pluginId, version,
            format: "bundle", trust: "unverified",
            capabilities: ["data:own"], category: "Custom", icon: "📦",
        };
        const manifest = getInstallManifest(detail);
        const manifestB64 = btoa(JSON.stringify(manifest));
        const redirectTo = window.location.href.split("?")[0]; // current page, no params

        const url = new URL(`${instanceUrl}/api/marketplace/install-redirect`);
        url.searchParams.set("pluginId", pluginId);
        url.searchParams.set("version", version);
        url.searchParams.set("manifest", manifestB64);
        url.searchParams.set("redirectTo", redirectTo);
        return url.toString();
    }

    function handleInstall() {
        const instanceUrl = getInstanceUrl();
        if (!instanceUrl) {
            setShowConfig(true);
            return;
        }
        window.location.href = buildRedirectUrl(instanceUrl);
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
            ) : (
                <button className={styles.btn} onClick={handleInstall}>
                    Install Plugin
                </button>
            )}
        </>
    );
}
