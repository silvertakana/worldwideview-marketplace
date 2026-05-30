"use client";

import { useEffect } from "react";
import { getInstanceUrl, setInstanceUrl } from "@/lib/instanceStore";

/**
 * On every cold mount: fetch the authenticated user's saved instances and sync
 * localStorage to the server's most-recently-used entry.
 *
 * Why we OVERWRITE localStorage (instead of early-returning when it's set):
 *   - Every legitimate write to localStorage (InstanceCapture, InstanceConfig,
 *     InstancePicker) also POSTs to /api/instances/link, so the server is the
 *     authoritative record of "where this user installs."
 *   - Without overwrite, machine B with a stale localStorage value never picks
 *     up new instances saved on machine A -- the cross-device guarantee fails.
 *   - With overwrite, the user's most recent choice (anywhere) wins everywhere
 *     they sign in.
 *
 * Anonymous callers get an empty array response (200 + { instances: [] }) -- their
 * localStorage stays whatever it was (likely a ?from_instance= capture from a
 * WWV they navigated from). The length === 0 guard handles this silently.
 */
export default function InstanceHydrator() {
    useEffect(() => {
        fetch("/api/me/instances", { method: "GET" })
            .then((res) => {
                if (!res.ok) return null;
                return res.json() as Promise<{ instances: Array<{ url: string }> }>;
            })
            .then((data) => {
                if (!data || data.instances.length === 0) return;
                const mostRecent = data.instances[0].url;
                if (getInstanceUrl() !== mostRecent) {
                    setInstanceUrl(mostRecent);
                }
            })
            .catch(() => { /* ignore network errors */ });
    }, []);

    return null;
}
