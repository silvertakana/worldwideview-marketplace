"use client";

import { useState, useEffect, useCallback } from "react";
import { getInstanceConfig } from "@/lib/instanceStore";

export interface InstalledPluginRecord {
  id: string;
  pluginId: string;
  version: string;
  config: string;
  installedAt: string;
}

interface HookResult {
  plugins: InstalledPluginRecord[];
  loading: boolean;
  error: string;
  configured: boolean;
  refetch: () => void;
}

/**
 * Fetch installed plugins from the user's WWV instance via bridge API.
 * Returns { configured: false } if no instance config is saved.
 */
export function useInstalledPlugins(): HookResult {
  const [plugins, setPlugins] = useState<InstalledPluginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    const config = getInstanceConfig();
    if (!config) {
      setConfigured(false);
      setLoading(false);
      return;
    }
    setConfigured(true);

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`${config.url}/api/marketplace/status`, {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(8000),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        setPlugins(data.plugins ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to fetch");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [trigger]);

  return { plugins, loading, error, configured, refetch };
}
