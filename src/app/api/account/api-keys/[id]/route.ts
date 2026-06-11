import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the local marketplace user by supabaseUserId
    const marketplaceUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
    });

    if (!marketplaceUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the key by ID, scoped to the current user
    const apiKey = await prisma.marketplaceApiKey.findFirst({
      where: {
        id,
        userId: marketplaceUser.id,
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Idempotent: already-revoked keys return 200
    if (apiKey.revokedAt !== null) {
      return NextResponse.json({ success: true, revokedAt: apiKey.revokedAt });
    }

    const now = new Date();
    await prisma.marketplaceApiKey.update({
      where: { id },
      data: { revokedAt: now },
    });

    return NextResponse.json({ success: true, revokedAt: now.toISOString() });
  } catch (error) {
    console.error("API key revocation failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
