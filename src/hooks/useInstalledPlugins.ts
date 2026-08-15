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
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        const instanceUrl = getInstanceUrl();
        if (!instanceUrl || !configured) {
          if (cancelled) return null;
          setPlugins([]);
          return null;
        }
        return fetch(`${instanceUrl}/api/marketplace/status`, {
          headers: {
            ...(getMarketplaceToken()
              ? { Authorization: `Bearer ${getMarketplaceToken()}` }
              : {}),
          },
          signal: AbortSignal.timeout(8000),
        });
      })
      .then((res) => {
        if (cancelled || !res) return;
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
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
