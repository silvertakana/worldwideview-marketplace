import { PrismaClient } from '../node_modules/@prisma/client/index.js';
import { PrismaBetterSqlite3 } from '../node_modules/@prisma/adapter-better-sqlite3/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../prisma/registry.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const p = new PrismaClient({ adapter });

const USER_ID = '328733b4-af8a-4882-8441-92af33736723';

try {
  const created = await p.linkedInstance.create({
    data: {
      userId: USER_ID,
      url: 'http://localhost:3000',
      nickname: 'Local Dev',
    },
  });
  console.log('Created:', JSON.stringify(created, null, 2));

  const all = await p.linkedInstance.findMany({
    where: { userId: USER_ID },
    select: { id: true, url: true, nickname: true, lastUsedAt: true },
    orderBy: { lastUsedAt: 'desc' },
  });
  console.log('All instances:', JSON.stringify(all, null, 2));
} finally {
  await p.$disconnect();
}
