import type { PluginCard, PluginDetail, NpmPackageMeta } from "./types";
import { prisma } from "@/lib/prisma";
import type { Prisma, Plugin, NpmCache } from "@prisma/client";

/** Default page size when a caller paginates without specifying one. */
export const DEFAULT_PAGE_SIZE = 50;

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PluginListPage {
  plugins: PluginCard[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface CardsResult {
  cards: PluginCard[];
  page: number;
  pageSize: number;
  total: number;
}

/** Where-clause for the public registry listing (pending plugins are hidden). */
function pluginWhere(category?: string): Prisma.PluginWhereInput {
  const where: Prisma.PluginWhereInput = { trust: { not: "pending" } };
  if (category && category !== "All") where.category = category;
  return where;
}

function resolvePagination(pagination?: PaginationOptions) {
  const page = Math.max(1, Math.floor(pagination?.page ?? 1));
  const pageSize = Math.max(1, Math.floor(pagination?.pageSize ?? DEFAULT_PAGE_SIZE));
  return { page, pageSize };
}

/**
 * Run the (already filtered) where-clause against the database, merging npm
 * cache metadata into cards. When pagination is requested the query is bounded
 * with skip/take and paired with a count; otherwise the full list is returned
 * so existing consumers keep their behavior.
 */
async function fetchCards(
  where: Prisma.PluginWhereInput,
  pagination?: PaginationOptions,
): Promise<CardsResult> {
  const paged = pagination?.page !== undefined;
  const { page, pageSize } = resolvePagination(pagination);

  const findManyArgs: Prisma.PluginFindManyArgs = paged
    ? { where, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize }
    : { where };
  const [dbPlugins, total] = await Promise.all([
    prisma.plugin.findMany(findManyArgs),
    paged ? prisma.plugin.count({ where }) : Promise.resolve(0),
  ]);

  const cacheRecords = await prisma.npmCache.findMany({
    where: { npmPackage: { in: dbPlugins.map((p) => p.npmPackage) } },
  });
  const metaMap = new Map<string, NpmPackageMeta>();
  cacheRecords.forEach((c) => metaMap.set(c.npmPackage, mapCacheToMeta(c)));

  return {
    cards: dbPlugins.map((dbPlugin) =>
      mergeToCard(dbPlugin, metaMap.get(dbPlugin.npmPackage) ?? null),
    ),
    page,
    pageSize,
    total: paged ? total : dbPlugins.length,
  };
}

/**
 * Build PluginCard objects by merging database metadata with local crawler
 * cache (NpmCache). Without pagination this returns the full list (PluginCard[]);
 * with `pagination.page` set it returns a PluginListPage envelope.
 */
export async function getAllPlugins(category?: string): Promise<PluginCard[]>;
export async function getAllPlugins(
  category: string | undefined,
  pagination: PaginationOptions | undefined,
): Promise<PluginCard[] | PluginListPage>;
export async function getAllPlugins(
  category?: string,
  pagination?: PaginationOptions,
): Promise<PluginCard[] | PluginListPage> {
  const result = await fetchCards(pluginWhere(category), pagination);
  if (pagination?.page === undefined) return result.cards;
  return toPage(result);
}

/**
 * Search plugins by query string using database-side filtering (no in-memory
 * post-filtering): matches npm cache name/description/keywords via a native
 * OR-contains clause, plus the plugin id and longDescription fallbacks that the
 * card merge uses when npm metadata is absent. Same pagination contract as
 * getAllPlugins.
 */
export async function searchPlugins(
  query: string,
  category?: string,
): Promise<PluginCard[]>;
export async function searchPlugins(
  query: string,
  category: string | undefined,
  pagination: PaginationOptions | undefined,
): Promise<PluginCard[] | PluginListPage>;
export async function searchPlugins(
  query: string,
  category?: string,
  pagination?: PaginationOptions,
): Promise<PluginCard[] | PluginListPage> {
  const q = query.trim();
  if (!q) return getAllPlugins(category, pagination);

  const cacheMatches = await prisma.npmCache.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
        { keywords: { contains: q } },
      ],
    },
    select: { npmPackage: true },
  });

  const where: Prisma.PluginWhereInput = {
    ...pluginWhere(category),
    OR: [
      { npmPackage: { in: cacheMatches.map((c) => c.npmPackage) } },
      { id: { contains: q } },
      { longDescription: { contains: q } },
    ],
  };

  const result = await fetchCards(where, pagination);
  if (pagination?.page === undefined) return result.cards;
  return toPage(result);
}

function toPage(result: CardsResult): PluginListPage {
  return {
    plugins: result.cards,
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: Math.ceil(result.total / result.pageSize),
  };
}

/** Return a single plugin's full detail by marketplace id. */
export async function getPluginById(
  id: string,
): Promise<PluginDetail | null> {
  const dbPlugin = await prisma.plugin.findUnique({ where: { id } });
  if (!dbPlugin || dbPlugin.trust === "pending") return null;

  const cacheRecord = await prisma.npmCache.findUnique({
    where: { npmPackage: dbPlugin.npmPackage },
  });

  const npm = cacheRecord ? mapCacheToMeta(cacheRecord) : null;
  return mergeToDetail(dbPlugin, npm);
}

/* ---------- helpers ---------- */

function mapCacheToMeta(c: NpmCache): NpmPackageMeta {
  let keywords: string[] = [];
  try {
    keywords = JSON.parse(c.keywords);
  } catch (e) {}

  return {
    name: c.name,
    description: c.description,
    version: c.version,
    author: c.author,
    keywords,
    repository: c.repository ?? undefined,
    readme: c.readme ?? undefined,
    changelog: c.changelog ?? undefined,
    updatedAt: c.updatedAt,
  };
}

function mergeToCard(
  dbPlugin: Plugin,
  npm: NpmPackageMeta | null,
): PluginCard {
  return {
    id: dbPlugin.id,
    npmPackage: dbPlugin.npmPackage,
    name: npm?.name?.replace("@worldwideview/wwv-plugin-", "")
      ? formatName(npm.name)
      : dbPlugin.id,
    description: npm?.description ?? dbPlugin.longDescription.slice(0, 80),
    category: dbPlugin.category,
    icon: dbPlugin.icon,
    installs: dbPlugin.installs, // Real count: incremented by /api/install/start (Plugin.installs)
    author: npm?.author ?? "WorldWideView",
    version: npm?.version ?? "0.0.0",
    format: dbPlugin.format as "bundle" | "static" | "declarative",
    trust: dbPlugin.trust as "built-in" | "verified" | "unverified",
    tags: npm?.keywords ?? [],
    updatedAt: npm?.updatedAt ?? "—",
  };
}

function mergeToDetail(
  dbPlugin: Plugin,
  npm: NpmPackageMeta | null,
): PluginDetail {
  let capabilities: string[] = [];
  try {
    capabilities = JSON.parse(dbPlugin.capabilities);
  } catch (e) {}

  return {
    ...mergeToCard(dbPlugin, npm),
    longDescription: dbPlugin.longDescription,
    capabilities,
    compatibility: ">=0.1.0",
    repository: npm?.repository,
    changelog: npm?.changelog ?? dbPlugin.changelog ?? "",
    readme: npm?.readme,
  };
}

/** Derive a human-readable name from the npm package name. */
function formatName(npmName: string): string {
  return npmName
    .replace("@worldwideview/wwv-plugin-", "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
