import { NextRequest, NextResponse } from "next/server";
import { getAllPlugins, searchPlugins } from "@/data/pluginService";

function parsePositiveInt(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q");
  const category = searchParams.get("category") ?? undefined;
  const page = parsePositiveInt(searchParams.get("page"));
  const pageSize = parsePositiveInt(searchParams.get("pageSize"));
  const pagination = page === undefined ? undefined : { page, pageSize };

  // Without a `page` param this stays a plain array (existing UI contract);
  // with one, callers get a { plugins, page, pageSize, total, totalPages } page.
  const plugins = query
    ? await searchPlugins(query, category, pagination)
    : await getAllPlugins(category, pagination);

  return NextResponse.json(plugins);
}
