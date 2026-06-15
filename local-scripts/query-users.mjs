import { PrismaClient } from '../node_modules/@prisma/client/index.js';
import { PrismaBetterSqlite3 } from '../node_modules/@prisma/adapter-better-sqlite3/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../prisma/registry.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const p = new PrismaClient({ adapter });

try {
  const users = await p.user.findMany({ select: { id: true, email: true } });
  console.log('Users:', JSON.stringify(users, null, 2));

  const instances = await p.linkedInstance.findMany({
    select: { id: true, userId: true, url: true, lastUsedAt: true }
  });
  console.log('LinkedInstances:', JSON.stringify(instances, null, 2));
} finally {
  await p.$disconnect();
}
