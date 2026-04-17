import { NextResponse } from "next/server";
import { getPluginById } from "@/data/pluginService";
import { getInstallManifest } from "@/data/pluginManifests";

function isNewer(latest: string, current: string): boolean {
  if (current === "built-in" || current === "0.0.0" || !latest || latest === "0.0.0") return false;
  
  const l = latest.replace(/^[vV]/, "").split('-')[0].split('.').map(Number);
  const c = current.replace(/^[vV]/, "").split('-')[0].split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const lPart = l[i] || 0;
    const cPart = c[i] || 0;
     if (lPart > cPart) return true;
     if (lPart < cPart) return false;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const { plugins } = await request.json();
    
    if (!Array.isArray(plugins)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const updates = [];

    for (const reqPlugin of plugins) {
      if (!reqPlugin.pluginId || !reqPlugin.version) continue;
      
      const detail = await getPluginById(reqPlugin.pluginId);
      if (!detail) continue;

      if (isNewer(detail.version, reqPlugin.version)) {
        updates.push({
          pluginId: detail.id,
          latestVersion: detail.version,
          manifest: getInstallManifest(detail)
        });
      }
    }

    return NextResponse.json({ updates });
    
  } catch (err) {
    console.error("[Registry Updates] Error:", err);
    return NextResponse.json(
      { error: "Registry query failed" },
      { status: 500 }
    );
  }
}
