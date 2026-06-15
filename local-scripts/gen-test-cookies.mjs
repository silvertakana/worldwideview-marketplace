/**
 * Formats tokens from the first magic link flow into Supabase SSR chunked base64 cookies.
 * Outputs JSON for direct use in Playwright addCookies().
 */

// Tokens captured from first magic link test run
const ACCESS_TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImNhNGU3NjJiLTQwZWItNGUxZS1hNGI1LWZkODliMmY0NzE5YiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2t2bG56anRjc3RuYXFrcHFycXVmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMjg3MzNiNC1hZjhhLTQ4ODItODQ0MS05MmFmMzM3MzY3MjMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgwMDY1ODY2LCJpYXQiOjE3ODAwNjIyNjYsImVtYWlsIjoiZG9jb2thOTgzNEBub3lhdmlwLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiYXZhdGFyX3VybCI6ImRhdGE6aW1hZ2UvanBlZztiYXNlNjQiLCJkaXNwbGF5X25hbWUiOiJ0ZXN0IiwiZW1haWwiOiJkb2Nva2E5ODM0QG5veWF2aXAuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMzI4NzMzYjQtYWY4YS00ODgyLTg0NDEtOTJhZjMzNzM2NzIzIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzgwMDYyMjY2fV0sInNlc3Npb25faWQiOiI3YzZiNDYzZi1lODUwLTQwN2EtYTE5ZC01ZmRmMTA0MDE1YjUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.D6sriTl_rFCHJK_Lqsplbf4vX_47AD5ByhCCQHk1YlKJOKFHRNdgSIY1wQa2OtZZIbaS9A7NQVGrKWEZ-wpdSw';
const REFRESH_TOKEN = 'vuor7lvpscww';
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
