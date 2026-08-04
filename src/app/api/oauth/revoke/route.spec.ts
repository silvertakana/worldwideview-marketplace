import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/requireSession", () => ({
  getSupabaseUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceApiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "./route";
import { getSupabaseUser } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/auth/apiKeyHash";

const mockGetSupabaseUser = vi.mocked(getSupabaseUser);
const mockFindUnique = vi.mocked(prisma.marketplaceApiKey.findUnique);
const mockUpdate = vi.mocked(prisma.marketplaceApiKey.update);

const KEY_A_RAW = "key-a-raw-abcdefghijklmnopqrstuvwxyz";
const KEY_A_HASH = hashApiKey(KEY_A_RAW);
const KEY_B_RAW = "key-b-raw-abcdefghijklmnopqrstuvwxyz";
const KEY_B_HASH = hashApiKey(KEY_B_RAW);

function jsonPost(token: string): Request {
  return new Request("http://localhost/api/oauth/revoke", {
    method: "POST",
    body: JSON.stringify({ token }),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/oauth/revoke", () => {
  it("revokes the session user's own key", async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: "user-A" } as Awaited<ReturnType<typeof getSupabaseUser>>);
    mockFindUnique.mockResolvedValue({ id: "key-1", userId: "user-A", keyHash: KEY_A_HASH, revokedAt: null } as never);
    mockUpdate.mockResolvedValue({ id: "key-1", userId: "user-A", keyHash: KEY_A_HASH, revokedAt: new Date() } as never);

    const res = await POST(jsonPost(KEY_A_RAW));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { keyHash: KEY_A_HASH } });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("allows a token to revoke itself without a session", async () => {
    mockGetSupabaseUser.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue({ id: "key-2", userId: "user-A", keyHash: KEY_A_HASH, revokedAt: null } as never);
    mockUpdate.mockResolvedValue({ id: "key-2", userId: "user-A", keyHash: KEY_A_HASH, revokedAt: new Date() } as never);

    const res = await POST(jsonPost(KEY_A_RAW));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "key-2" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("does not reveal validity when revoking an unknown token with a valid session", async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: "user-A" } as Awaited<ReturnType<typeof getSupabaseUser>>);
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(jsonPost("unknown-token-abc"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not let user A revoke user B's key", async () => {
    mockGetSupabaseUser.mockResolvedValue({ id: "user-A" } as Awaited<ReturnType<typeof getSupabaseUser>>);
    mockFindUnique.mockResolvedValue({ id: "key-B", userId: "user-B", keyHash: KEY_B_HASH, revokedAt: null } as never);

    const res = await POST(jsonPost(KEY_B_RAW));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no session and the token is invalid", async () => {
    mockGetSupabaseUser.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(jsonPost("unknown-token-abc"));

    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("accepts form-encoded bodies per RFC 7009", async () => {
    mockGetSupabaseUser.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue({ id: "key-3", userId: "user-A", keyHash: KEY_A_HASH, revokedAt: null } as never);
    mockUpdate.mockResolvedValue({ id: "key-3", userId: "user-A", keyHash: KEY_A_HASH, revokedAt: new Date() } as never);

    const res = await POST(
      new Request("http://localhost/api/oauth/revoke", {
        method: "POST",
        body: new URLSearchParams({ token: KEY_A_RAW }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "key-3" },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
