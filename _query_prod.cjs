const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.tmpdir(), 'marketplace-registry.db');
const db = new Database(dbPath, {readonly: true});

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('=== TABLES ===');
tables.forEach(t => console.log(t.name));

const instances = db.prepare(`
  SELECT li.id, li.url, li.nickname, li.createdAt, li.lastUsedAt, li.userId, u.email, u.tier
  FROM linked_instances li 
  JOIN User u ON li.userId = u.id
  ORDER BY u.email
`).all();

console.log(`\n=== LINKED INSTANCES (${instances.length}) ===`);
if (instances.length === 0) {
  console.log('(none)');
} else {
  for (const r of instances) {
    console.log(`${r.email} | url: ${r.url} | nickname: ${r.nickname || '-'} | created: ${r.createdAt} | lastUsed: ${r.lastUsedAt}`);
  }
}

const users = db.prepare("SELECT id, email, supabaseUserId, tier, createdAt FROM User ORDER BY createdAt").all();
console.log(`\n=== ALL MARKETPLACE USERS (${users.length}) ===`);
for (const u of users) {
  console.log(`${u.email} | tier: ${u.tier} | supabaseId: ${u.supabaseUserId || '-'} | created: ${u.createdAt}`);
}

db.close();
