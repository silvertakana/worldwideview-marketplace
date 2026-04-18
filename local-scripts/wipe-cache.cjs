const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');

const db = new Database('C:\\dev\\worldwideview-marketplace\\prisma\\registry.db', { fileMustExist: true });
const adapter = new PrismaBetterSqlite3({ url: 'file:C:\\dev\\worldwideview-marketplace\\prisma\\registry.db' });
// Or just let bare Prisma connect to SQLite
const prisma = new PrismaClient({ adapter });

async function run() {
    await prisma.npmCache.deleteMany({ where: { npmPackage: '@worldwideview/wwv-plugin-satellite' } });
    console.log("Wiped poisoned NPM cache from Marketplace records.");
}
run();
