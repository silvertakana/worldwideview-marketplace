import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { createHash } from "node:crypto";
import { KNOWN_PLUGINS } from "../src/data/knownPlugins";

function hashApiKey(rawKey: string): string {
    return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

async function main() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), "prisma", "registry.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` } as any);
  const prisma = new PrismaClient({ adapter });

  for (const plugin of KNOWN_PLUGINS) {
    if (plugin.id === "sdk") continue;
    await prisma.plugin.upsert({
      where: { id: plugin.id },
      update: {},
      create: {
        id: plugin.id,
        npmPackage: plugin.npmPackage,
        icon: plugin.icon,
        category: plugin.category,
        format: plugin.format,
        trust: plugin.trust,
        capabilities: JSON.stringify(plugin.capabilities || []),
        longDescription: plugin.longDescription,
        changelog: plugin.changelog,
      },
    });
  }

  const pluginCount = await prisma.plugin.count();
  console.log(`Seeded ${pluginCount} plugins into the database.`);

  // Dev-only: seed a test user + API key for local exchange endpoint testing
  const devUser = await prisma.user.upsert({
    where: { email: "dev@worldwideview.local" },
    update: {},
    create: { email: "dev@worldwideview.local" },
  });
  await prisma.marketplaceApiKey.upsert({
    where: { keyHash: hashApiKey("dev-key-do-not-use-in-prod") },
    update: {},
    create: {
      userId: devUser.id,
      keyHash: hashApiKey("dev-key-do-not-use-in-prod"),
      name: "dev seed key",
    },
  });
  console.log(`Seeded dev user (${devUser.email}) with test API key.`);

  await prisma.$disconnect();
}

main();
