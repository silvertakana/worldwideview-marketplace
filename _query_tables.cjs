const Database = require('better-sqlite3');
const db = new Database('./prisma/registry.db', {readonly: true});

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log("=== TABLES ===");
tables.forEach(t => console.log(t.name));

const users = db.prepare("SELECT * FROM User ORDER BY createdAt").all();
console.log("\n=== USERS ===");
users.forEach(u => console.log(`${u.email} | tier: ${u.tier} | supabaseUserId: ${u.supabaseUserId || '-'}`));

db.close();
