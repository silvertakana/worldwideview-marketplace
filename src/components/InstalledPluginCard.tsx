"use client";

import { useState } from "react";
import { getInstanceConfig } from "@/lib/instanceStore";
import { PLUGIN_DETAILS } from "@/data/pluginDetails";
import styles from "./InstalledPluginCard.module.css";

interface Props {
  pluginId: string;
  version: string;
  installedAt: string;
  onUninstalled: () => void;
}

export default function InstalledPluginCard({
  pluginId,
  version,
  installedAt,
  onUninstalled,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const detail = PLUGIN_DETAILS[pluginId];

  async function handleUninstall() {
    const config = getInstanceConfig();
    if (!config) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${config.url}/api/marketplace/uninstall`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify({ pluginId }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        onUninstalled();
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

  const displayName = detail?.name ?? pluginId;
  const displayIcon = detail?.icon ?? "📦";
  const displayDesc = detail?.description ?? "Marketplace plugin";
  const date = new Date(installedAt).toLocaleDateString();

  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <span className={styles.icon}>{displayIcon}</span>
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{displayName}</h3>
        <p className={styles.desc}>{displayDesc}</p>
        <div className={styles.meta}>
          <span className={styles.badge}>v{version}</span>
          <span className={styles.date}>Installed {date}</span>
        </div>
      </div>

      <div className={styles.actions}>
        {status === "loading" ? (
          <button className={`${styles.btn} ${styles.btnLoading}`} disabled>
            Removing…
          </button>
        ) : (
          <button className={styles.btn} onClick={handleUninstall}>
            Uninstall
          </button>
        )}
        {status === "error" && (
          <p className={styles.error}>{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
