"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getInstanceUrl, getMarketplaceToken, setMarketplaceToken } from "@/lib/instanceStore";

interface InstalledPluginsContextValue {
  /** Set of installed plugin IDs (empty if not connected). */
  installedIds: Set<string>;
  /** Set of plugin IDs pending user confirmation on the WWV instance. */
  pendingIds: Set<string>;
  /** Whether the fetch is in progress. */
  loading: boolean;
  /** Whether an instance URL is configured. */
  configured: boolean;
  /** Re-fetch installed plugins from the instance. */
  refetch: () => void;
}

const InstalledPluginsContext = createContext<InstalledPluginsContextValue>({
  installedIds: new Set(),
  pendingIds: new Set(),
  loading: false,
  configured: false,
  refetch: () => {},
});

export function useInstalledIds() {
  return useContext(InstalledPluginsContext);
}

export default function InstalledPluginsProvider({ children }: { children: ReactNode }) {
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  // Global: extract token + installed/pending param from URL after redirect
  useEffect(() => {
    const hash = window.location.hash;
    const tokenMatch = hash.match(/[#&]token=([^&]*)/);
    if (tokenMatch?.[1]) {
      setMarketplaceToken(tokenMatch[1]);
    }

    const params = new URLSearchParams(window.location.search);
    const installed = params.has("installed");
    const installError = params.has("install_error");
    const pendingPlugin = params.get("pending");

    // Track pending approval for unverified plugins
    if (pendingPlugin) {
      setPendingIds((prev) => new Set(prev).add(pendingPlugin));
    }

    // Clean handled params from the URL
    if (tokenMatch || installed || installError || pendingPlugin) {
      const clean = new URL(window.location.href);
      clean.hash = "";
      clean.searchParams.delete("installed");
      clean.searchParams.delete("install_error");
      clean.searchParams.delete("pending");
      window.history.replaceState({}, "", clean.toString());
    }

    // Trigger a refetch so the new token is used immediately
    if (tokenMatch || installed) {
      setTrigger((t) => t + 1);
    }
  }, []);

  useEffect(() => {
    const instanceUrl = getInstanceUrl();
    if (!instanceUrl) {
      setConfigured(false);
      setLoading(false);
      return;
    }
    setConfigured(true);

    let cancelled = false;
    setLoading(true);

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
        const ids = new Set<string>(
          (data.plugins ?? []).map((p: { pluginId: string }) => p.pluginId),
        );
        setInstalledIds(ids);
        // Clear pending for plugins that are now confirmed as installed
        setPendingIds((prev) => {
          const next = new Set(prev);
          for (const id of prev) {
            if (ids.has(id)) next.delete(id);
          }
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setInstalledIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [trigger]);

  return (
    <InstalledPluginsContext.Provider
      value={{ installedIds, pendingIds, loading, configured, refetch }}
    >
      {children}
    </InstalledPluginsContext.Provider>
  );
}
