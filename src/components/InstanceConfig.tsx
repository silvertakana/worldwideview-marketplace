"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { getInstanceUrl, setInstanceUrl } from "@/lib/instanceStore";
import styles from "./InstanceConfig.module.css";

interface Props {
    onConfigured: () => void;
    onCancel: () => void;
    /** Page to return to after WWV issues the token (defaults to current URL) */
    returnPath?: string;
}

type ConnectionStatus = "idle" | "testing" | "success" | "error" | "demo-blocked";

export default function InstanceConfig({ onConfigured, onCancel, returnPath }: Props) {
    const [url, setUrl] = useState(() => getInstanceUrl() ?? "http://localhost:3000");
    const [status, setStatus] = useState<ConnectionStatus>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    async function handleTest(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        setStatus("testing");
        setErrorMsg("");
        
        let sanitizedUrl = url;
        if (sanitizedUrl.includes("0.0.0.0")) {
            sanitizedUrl = sanitizedUrl.replace("0.0.0.0", "localhost");
        }
        
        try {
            const targetUrl = `${sanitizedUrl.replace(/\/+$/, "")}/api/auth/setup-status`;
            const res = await fetch(targetUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "x-marketplace-ping": "true"
                },
                signal: AbortSignal.timeout(5000),
            });
            
            if (!res.ok) {
                setStatus("error");
                setErrorMsg(
                    res.status === 503
                        ? "Instance is starting up — database is not ready yet. Try again shortly."
                        : `Server returned ${res.status} — the instance may need to be restarted.`
                );
                return;
            }
            const data = await res.json();
            if (data.pluginManagementEnabled === false) {
                setStatus("demo-blocked");
                return;
            }
            setStatus("success");
        } catch {
            setStatus("error");
            setErrorMsg(
                "Could not connect — check the URL and ensure WWV is running. " +
                "If using a remote instance, it may have a CORS or SSL issue."
            );
        }
    }

    function handleSave(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        
        let sanitizedUrl = url;
        // Browsers block direct navigation to 0.0.0.0 — automatically swap to localhost
        if (sanitizedUrl.includes("0.0.0.0")) {
            sanitizedUrl = sanitizedUrl.replace("0.0.0.0", "localhost");
        }
        
        setInstanceUrl(sanitizedUrl);

        // Fire-and-forget: also save this instance to the user's account
        // server-side so future installs from new devices auto-detect it.
        // 401 (anonymous) is fine — they'll re-link after signing in.
        fetch("/api/instances/link", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: sanitizedUrl }),
        }).catch(() => { /* ignore network errors */ });

        // Redirect to WWV to obtain a marketplace token via session auth.
        // WWV will redirect back to returnPath with ?token=<jwt>.
        const returnTo = returnPath ?? window.location.href.split("?")[0];
        const grantUrl = new URL(`${sanitizedUrl.replace(/\/+$/, "")}/api/marketplace/grant-token`);
        grantUrl.searchParams.set("redirectTo", returnTo);
        window.location.href = grantUrl.toString();
    }

    function handleOverlayClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
    }

    function handleCancelClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
    }

    const canSave = status === "success";

    return createPortal(
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>Connect Your Instance</h2>
                <p className={styles.subtitle}>
                    Enter the URL of your WorldWideView instance. You{"'"}ll be asked to
                    sign in when installing a plugin.
                </p>

                <label className={styles.label}>Instance URL</label>
                <input
                    className={styles.input}
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setStatus("idle"); }}
                    placeholder="http://localhost:3000"
                />

                {status === "error" && <p className={styles.error}>{errorMsg}</p>}
                {status === "success" && <p className={styles.success}>✓ Instance reachable</p>}
                {status === "demo-blocked" && (
                    <p className={styles.warning}>
                        ⚠ Plugin management is not enabled on this instance.
                        Please connect a local or cloud instance instead.
                    </p>
                )}

                <div className={styles.actions}>
                    <button className={styles.btnSecondary} onClick={handleCancelClick}>Cancel</button>
                    <button
                        className={styles.btnTest}
                        onClick={handleTest}
                        disabled={!url || status === "testing"}
                    >
                        {status === "testing" ? "Testing…" : "Test Connection"}
                    </button>
                    <button
                        className={styles.btnSave}
                        onClick={handleSave}
                        disabled={!canSave}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

