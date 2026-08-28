import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// WAL mode requires a local volume (e.g. a Docker named volume); it can corrupt the database on network filesystems such as NFS.
const SQLITE_BUSY_TIMEOUT_MS = 5000;

function applyWalPragma(dbUrl: string): void {
  const dbPath = dbUrl.replace(/^file:/, "");
  if (dbPath === "" || dbPath === ":memory:") return;
  const db = new Database(dbPath);
  try {
    db.pragma("journal_mode = WAL");
  } finally {
    db.close();
  }
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL
    ?? `file:${path.join(process.cwd(), "prisma", "registry.db")}`;
  applyWalPragma(dbUrl);
  const adapter = new PrismaBetterSqlite3({ url: dbUrl, timeout: SQLITE_BUSY_TIMEOUT_MS });
  return new PrismaClient({ adapter });
}

/** Singleton Prisma client (avoids hot-reload connection storms in dev). */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
