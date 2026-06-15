
const Database = require('better-sqlite3');
const db = new Database('prisma/registry.db', {readonly: true});
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(JSON.stringify(tables));
const cols = db.prepare("PRAGMA table_info(User)").all();
console.log("User columns:", JSON.stringify(cols.map(c => c.name)));
db.close();
