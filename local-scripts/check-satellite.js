const Database = require('better-sqlite3');
const db = new Database('C:\\dev\\worldwideview-marketplace\\prisma\\registry.db', { fileMustExist: true });
const stmt = db.prepare('SELECT id, npmPackage, format FROM Plugin');
console.log(stmt.all());
