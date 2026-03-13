"use client";

import { useState } from "react";
import { getInstanceConfig, setInstanceConfig } from "@/lib/instanceStore";
import styles from "./InstanceConfig.module.css";

interface Props {
    onConfigured: () => void;
    onCancel: () => void;
}

export default function InstanceConfig({ onConfigured, onCancel }: Props) {
    const existing = getInstanceConfig();
    const [url, setUrl] = useState(existing?.url ?? "http://localhost:3000");
    const [token, setToken] = useState(existing?.token ?? "");
    const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    async function handleTest() {
        setStatus("testing");
        setErrorMsg("");
        try {
            const res = await fetch(`${url.replace(/\/+$/, "")}/api/marketplace/status`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(5000),
            });
            if (res.ok) {
                setStatus("success");
            } else {
                setStatus("error");
                setErrorMsg(res.status === 401 ? "Invalid token" : `Server returned ${res.status}`);
            }
        } catch {
            setStatus("error");
            setErrorMsg("Could not connect — check the URL and ensure WWV is running");
        }
    }

    function handleSave() {
        setInstanceConfig(url, token);
        onConfigured();
    }

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>Configure Instance</h2>
                <p className={styles.subtitle}>
                    Enter your WorldWideView instance URL and bridge token.
                </p>

                <label className={styles.label}>Instance URL</label>
                <input
                    className={styles.input}
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setStatus("idle"); }}
                    placeholder="http://localhost:3000"
                />

                <label className={styles.label}>Bridge Token</label>
                <input
                    className={styles.input}
                    type="password"
                    value={token}
                    onChange={(e) => { setToken(e.target.value); setStatus("idle"); }}
                    placeholder="Your WWV_BRIDGE_TOKEN value"
                />

                {status === "error" && <p className={styles.error}>{errorMsg}</p>}
                {status === "success" && <p className={styles.success}>✓ Connected</p>}

                <div className={styles.actions}>
                    <button className={styles.btnSecondary} onClick={onCancel}>Cancel</button>
                    <button className={styles.btnTest} onClick={handleTest} disabled={!url || !token || status === "testing"}>
                        {status === "testing" ? "Testing…" : "Test Connection"}
                    </button>
                    <button className={styles.btnSave} onClick={handleSave} disabled={status !== "success"}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
