import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/auth/apiKeyHash";
import { getSupabaseUser } from "@/lib/auth/requireSession";
import { revokeLimiter, getClientIp } from "@/lib/rateLimiters";

/**
 * RFC 7009 token revocation endpoint.
 *
 * The caller is authenticated EITHER by an authenticated marketplace session
 * (the account owner) OR by the token itself (a globe presenting its own key).
 * When both are present the session wins.
 *
 * RFC 7009 §2.2: for an authenticated caller the response is ALWAYS
 * 200 { ok: true }, regardless of whether the token was valid — the endpoint
 * must not reveal whether a token existed. Only when the caller could not be
 * authenticated at all (no session AND no valid token) do we return 401.
 */
export async function POST(request: Request) {
  const sessionUser = await getSupabaseUser();
  const rateLimitKey = sessionUser?.id ?? getClientIp(request);
  const limiter = revokeLimiter.check(rateLimitKey);
  if (limiter) return limiter;

  let token: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    token = String(form.get("token") ?? "") || null;
  } else {
    try {
      const body = (await request.json()) as { token?: unknown };
      token = typeof body?.token === "string" && body.token ? body.token : null;
    } catch {
      token = null;
    }
  }

  if (!token) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const key = await prisma.marketplaceApiKey.findUnique({
    where: { keyHash: hashApiKey(token) },
  });

  if (sessionUser) {
    // Session is authoritative: the account owner may revoke any of their own
    // keys, but never another user's key.
    if (key && key.userId === sessionUser.id && key.revokedAt === null) {
      await prisma.marketplaceApiKey.update({
        where: { id: key.id },
        data: { revokedAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // No session: token self-authentication. Only a currently-valid key may
  // revoke itself; a revoked or unknown token does not authenticate.
  if (key && key.revokedAt === null) {
    await prisma.marketplaceApiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
