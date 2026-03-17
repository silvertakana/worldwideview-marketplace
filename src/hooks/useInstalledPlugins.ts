"use client";

import { useState, useEffect } from "react";
import { useInstalledIds } from "@/components/InstalledPluginsProvider";
import { getInstanceUrl, getMarketplaceToken } from "@/lib/instanceStore";

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
 * Thin wrapper around the shared InstalledPluginsProvider context.
 * Kept for backward compatibility with the Manage page which
 * expects the full plugin records from the status endpoint.
 * TODO: migrate Manage page to use the context directly.
 */
export function useInstalledPlugins(): HookResult {
  const { installedIds, loading, configured, refetch } = useInstalledIds();

  // The context only exposes IDs. For the Manage page we still need
  // full records, so we re-fetch when the context says plugins exist.
  // This is a pragmatic tradeoff to avoid breaking the Manage page.
  const [plugins, setPlugins] = useState<InstalledPluginRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const instanceUrl = getInstanceUrl();
    if (!instanceUrl || !configured) {
      setPlugins([]);
      return;
    }

    let cancelled = false;

    fetch(`${instanceUrl}/api/marketplace/status`, {
      headers: {
        ...(getMarketplaceToken()
          ? { Authorization: `Bearer ${getMarketplaceToken()}` }
          : {}),
      },
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
      });

    return () => { cancelled = true; };
  }, [configured, installedIds]);

  return { plugins, loading, error, configured, refetch };
}
