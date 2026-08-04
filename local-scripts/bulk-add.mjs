import fs from 'fs';

const packagesDir = 'C:\\dev\\worldwideview-plugins\\packages';
const packages = fs.readdirSync(packagesDir)
  .filter(name => name.startsWith('wwv-plugin-') && name !== 'wwv-plugin-sdk')
  .map(name => ({ id: `@worldwideview/${name}` }));

const MARKETPLACE_API_KEY = process.env.MARKETPLACE_API_KEY ?? '';

if (!MARKETPLACE_API_KEY) {
  console.error('Missing MARKETPLACE_API_KEY env var. Set it before running this script.');
  process.exit(1);
}

console.log(`Found ${packages.length} plugins. Sending to Admin Registry...`);

async function run() {
  const res = await fetch('http://localhost:3000/api/admin/registry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MARKETPLACE_API_KEY}`
    },
    body: JSON.stringify({ plugins: packages })
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log(`Successfully added ${data.plugins?.length || 0} plugins!`);
    if (data.errors && data.errors.length > 0) {
      console.log('Errors:', data.errors);
    }
  } else {
    console.error('Failed:', await res.text());
  }
}

run();
