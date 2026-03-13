import { NextResponse } from "next/server";
import { getPluginById } from "@/data/pluginService";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const plugin = await getPluginById(id);

  if (!plugin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(plugin);
}
