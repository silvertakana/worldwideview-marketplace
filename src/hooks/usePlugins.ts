"use client";

import { useEffect, useState } from "react";
import type { PluginCard } from "@/data/plugins";

interface UsePluginsResult {
  plugins: PluginCard[];
  loading: boolean;
  error: string | null;
}

interface UsePluginResult {
  plugin: PluginCard | null;
  loading: boolean;
  error: string | null;
}

/** Fetch all plugins, optionally filtered by category and search query. */
export function usePlugins(
  category?: string,
  query?: string,
): UsePluginsResult {
  const [plugins, setPlugins] = useState<PluginCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category && category !== "All") params.set("category", category);

    const qs = params.toString();
    const url = `/api/plugins${qs ? `?${qs}` : ""}`;

    setLoading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data: PluginCard[]) => {
        setPlugins(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [category, query]);

  return { plugins, loading, error };
}

/** Fetch a single plugin by ID. */
export function usePlugin(id: string): UsePluginResult {
  const [plugin, setPlugin] = useState<PluginCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/plugins/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data: PluginCard) => {
        setPlugin(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { plugin, loading, error };
}
