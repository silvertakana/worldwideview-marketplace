import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Use Docker's environment variable (e.g., file:/app/data/registry.db) if present
  const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "prisma", "registry.db")}`;
  // The PrismaBetterSqlite3 adapter appears to be using a config object with url
  const adapter = new PrismaBetterSqlite3({ url: dbUrl } as any);
  return new PrismaClient({ adapter });
}

/** Singleton Prisma client (avoids hot-reload connection storms in dev). */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
