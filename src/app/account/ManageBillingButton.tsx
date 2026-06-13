"use client";

import { useState } from "react";
import { ExternalLink, Zap } from "lucide-react";
import styles from "./account.module.css";

export function ManageBillingButton({
    hasSubscription,
    tier,
}: {
    hasSubscription: boolean;
    tier: string;
}) {
    const [loading, setLoading] = useState(false);

    async function handleManageBilling() {
        setLoading(true);
        try {
            const res = await fetch("/api/billing/portal", { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch {
            setLoading(false);
        }
    }

    if (tier === "free" && !hasSubscription) {
        return (
            <a
                href="/browse"
                className={styles.upgradeButton}
            >
                <Zap size={16} className={styles.btnIcon} />
                Upgrade to Pro
            </a>
        );
    }

    return (
        <button
            type="button"
            onClick={handleManageBilling}
            disabled={loading}
            className={styles.manageBillingButton}
        >
            <ExternalLink size={16} className={styles.btnIcon} />
            {loading ? "Loading..." : "Manage Billing"}
        </button>
    );
}
