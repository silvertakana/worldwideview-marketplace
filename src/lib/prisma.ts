import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

import Database from "better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || path.join(process.cwd(), "prisma", "registry.db");
  const dbPath = dbUrl.replace("file:", "");
  const db = new Database(dbPath);
  const adapter = new PrismaBetterSqlite3(db);
  return new PrismaClient({ adapter });
}

/** Singleton Prisma client (avoids hot-reload connection storms in dev). */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
