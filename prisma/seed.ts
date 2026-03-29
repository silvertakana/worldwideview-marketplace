import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { KNOWN_PLUGINS } from "../src/data/knownPlugins";

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

  const count = await prisma.plugin.count();
  console.log(`Seeded ${count} plugins into the database.`);
  await prisma.$disconnect();
}

main();
