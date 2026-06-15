import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(__dirname, '../prisma/registry.db')}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const USER_ID = '328733b4-af8a-4882-8441-92af33736723';
const TEST_PLUGIN_ID = 'uat-test-plugin-badge';

await prisma.user.upsert({
  where: { id: USER_ID },
  create: { id: USER_ID, email: 'docoka9834@noyavip.com', supabaseUserId: USER_ID },
  update: {},
});
console.log('User seeded');

const plugin = await prisma.plugin.upsert({
  where: { id: TEST_PLUGIN_ID },
  create: {
    id: TEST_PLUGIN_ID,
    npmPackage: '@wwv-test/uat-badge-plugin',
    category: 'Custom',
    format: 'ALL_BUNDLE',
    trust: 'COMMUNITY',
    icon: 'default',
    capabilities: JSON.stringify([]),
    longDescription: 'UAT test plugin for badge verification',
  },
  update: {},
});
console.log('Plugin:', plugin.id);

const install = await prisma.pluginInstall.upsert({
  where: { userId_pluginId: { userId: USER_ID, pluginId: TEST_PLUGIN_ID } },
  create: {
    userId: USER_ID,
    pluginId: TEST_PLUGIN_ID,
    pluginSlug: 'uat-badge-plugin',
    pluginVersion: '1.0.0',
    instanceUrl: 'http://localhost:3000',
  },
  update: {},
});
console.log('Install:', JSON.stringify(install));
await prisma.$disconnect();

