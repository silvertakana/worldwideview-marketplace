import { NextRequest, NextResponse } from "next/server";
import { getAllPlugins, searchPlugins } from "@/data/pluginService";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q");
  const category = searchParams.get("category") ?? undefined;

  const plugins = query
    ? await searchPlugins(query, category)
    : await getAllPlugins(category);

  return NextResponse.json(plugins);
}
