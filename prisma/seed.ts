import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const INITIAL_PLUGINS = [
  { id: "aviation", name: "Aviation" },
  { id: "maritime", name: "Maritime" },
  { id: "military-aviation", name: "Military Aviation" },
  { id: "wildfire", name: "Wildfire" },
  { id: "camera", name: "Camera" },
  { id: "borders", name: "Borders" },
  { id: "military-bases", name: "Military Bases" },
  { id: "sdk", name: "SDK" },
  { id: "nuclear-facilities", name: "Nuclear Facilities" },
  { id: "embassies", name: "Embassies" },
];

async function main() {
  const dbPath = path.join(process.cwd(), "prisma", "registry.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });

  for (const plugin of INITIAL_PLUGINS) {
    await prisma.verifiedPlugin.upsert({
      where: { id: plugin.id },
      update: {},
      create: plugin,
    });
  }

  const count = await prisma.verifiedPlugin.count();
  console.log(`Seeded ${count} verified plugins.`);
  await prisma.$disconnect();
}

main();
