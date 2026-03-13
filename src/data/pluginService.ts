import { PLUGINS, type PluginCard } from "./plugins";

/** Return all plugins, optionally filtered by category. */
export async function getAllPlugins(
  category?: string,
): Promise<PluginCard[]> {
  if (!category || category === "All") return PLUGINS;
  return PLUGINS.filter((p) => p.category === category);
}

/** Return a single plugin by its unique ID, or null if not found. */
export async function getPluginById(
  id: string,
): Promise<PluginCard | null> {
  return PLUGINS.find((p) => p.id === id) ?? null;
}

/**
 * Search plugins by a query string (matches name or description)
 * and an optional category filter.
 */
export async function searchPlugins(
  query: string,
  category?: string,
): Promise<PluginCard[]> {
  const q = query.toLowerCase();

  return PLUGINS.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);

    const matchesCategory =
      !category || category === "All" || p.category === category;

    return matchesQuery && matchesCategory;
  });
}
