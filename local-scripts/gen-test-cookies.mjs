/**
 * Formats tokens from the first magic link flow into Supabase SSR chunked base64 cookies.
 * Outputs JSON for direct use in Playwright addCookies().
 */

// Tokens captured from first magic link test run
const ACCESS_TOKEN = process.env.WWV_TEST_ACCESS_TOKEN ?? '';
const REFRESH_TOKEN = 'vuor7lvpscww';

if (!ACCESS_TOKEN) {
  console.error('Missing WWV_TEST_ACCESS_TOKEN env var. Set it to a captured access token before running.');
  process.exit(1);
}

const EXPIRES_AT = 1780065866;
const PROJECT_REF = 'kvlnzjtcstnaqkpqrquf';

const sessionJson = JSON.stringify({
  access_token: ACCESS_TOKEN,
  refresh_token: REFRESH_TOKEN,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: EXPIRES_AT,
  user: { id: '328733b4-af8a-4882-8441-92af33736723', email: 'docoka9834@noyavip.com' },
});

const encoded = Buffer.from(sessionJson).toString('base64');
const CHUNK_SIZE = 3900;
const chunks = [];
for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
  chunks.push(encoded.slice(i, i + CHUNK_SIZE));
}

const cookies = chunks.map((chunk, i) => ({
  name: `sb-${PROJECT_REF}-auth-token.${i}`,
  value: chunk,
  domain: '.wwv.local',
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
}));

console.log(JSON.stringify(cookies));
